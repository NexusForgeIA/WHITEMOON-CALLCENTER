"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Phone, Loader2, Plus, X, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { AgenteFilter, type AgenteFiltro } from "@/components/agente-filter";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AGENTES, AGENTE_MAP } from "@/lib/agentes";
import {
  PROSPECTO_ESTADO,
  PROSPECTO_ESTADO_ORDER,
  PROSPECTO_ORIGEN,
  PROSPECTO_PRIORIDAD,
} from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import type { Agente, CallCenterProspecto, ProspectoEstado } from "@/lib/types";

type Toast = { msg: string; type: "success" | "error" };

export function ProspectosView({
  prospectos,
}: {
  prospectos: CallCenterProspecto[];
}) {
  const router = useRouter();

  // Lista local sembrada del server; se resincroniza tras router.refresh().
  const [items, setItems] = useState(prospectos);
  useEffect(() => setItems(prospectos), [prospectos]);

  const [agente, setAgente] = useState<AgenteFiltro>("all");
  const [estado, setEstado] = useState<ProspectoEstado | "all">("all");
  const [q, setQ] = useState("");

  const [toast, setToast] = useState<Toast | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  // Llamada (con confirmación)
  const [target, setTarget] = useState<CallCenterProspecto | null>(null);
  const [callingId, setCallingId] = useState<string | null>(null);

  // Alta de prospecto
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [telefono, setTelefono] = useState("");
  const [sector, setSector] = useState<Agente>("dental");
  const [notas, setNotas] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((p) => {
      if (agente !== "all" && p.agente !== agente) return false;
      if (estado !== "all" && p.estado !== estado) return false;
      if (term) {
        const hay = [p.nombre, p.telefono, p.empresa]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [items, agente, estado, q]);

  async function confirmarLlamada() {
    const p = target;
    if (!p) return;
    setTarget(null);
    setCallingId(p.id);
    try {
      const res = await fetch("/api/llamar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agente: p.agente,
          telefono: p.telefono,
          nombre: p.nombre,
          empresa: p.empresa,
          prospecto_id: p.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        setToast({ msg: data?.error ?? `Error ${res.status}`, type: "error" });
        return;
      }
      // La Edge Function pone estado='llamando' + intentos++. Reflejo optimista.
      setItems((prev) =>
        prev.map((it) =>
          it.id === p.id
            ? {
                ...it,
                estado: "llamando",
                intentos: it.intentos + 1,
                ultima_llamada: new Date().toISOString(),
              }
            : it,
        ),
      );
      setToast({
        msg: `Llamada lanzada a ${p.nombre ?? p.telefono}.`,
        type: "success",
      });
      router.refresh();
    } catch (err) {
      setToast({ msg: String(err), type: "error" });
    } finally {
      setCallingId(null);
    }
  }

  async function guardarProspecto(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAddError(null);
    try {
      const res = await fetch("/api/prospectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, empresa, telefono, sector, notas }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        setAddError(data?.error ?? `Error ${res.status}`);
        return;
      }
      setItems((prev) => [data.prospecto as CallCenterProspecto, ...prev]);
      setShowAdd(false);
      setNombre("");
      setEmpresa("");
      setTelefono("");
      setSector("dental");
      setNotas("");
      setToast({ msg: "Prospecto añadido.", type: "success" });
      router.refresh();
    } catch (err) {
      setAddError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Prospectos"
        subtitle="Listas de prospectos por agente para lanzar llamadas"
        action={
          <button
            type="button"
            onClick={() => {
              setAddError(null);
              setShowAdd(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-p px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-p2"
          >
            <Plus className="h-4 w-4" />
            Añadir prospecto
          </button>
        }
      />

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <AgenteFilter value={agente} onChange={setAgente} />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as ProspectoEstado | "all")}
            className="rounded-lg border border-border bg-card/60 px-3 py-1.5 text-sm text-text outline-none focus:border-p"
          >
            <option value="all">Todos los estados</option>
            {PROSPECTO_ESTADO_ORDER.map((e) => (
              <option key={e} value={e}>
                {PROSPECTO_ESTADO[e].label}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar nombre, teléfono…"
              className="w-56 rounded-lg border border-border bg-card/60 py-1.5 pl-8 pr-3 text-sm text-text placeholder:text-muted outline-none focus:border-p"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 font-medium">Agente</th>
                <th className="px-4 py-3 font-medium">Origen</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Prioridad</th>
                <th className="px-4 py-3 font-medium">Dolor</th>
                <th className="px-4 py-3 font-medium">Intentos</th>
                <th className="px-4 py-3 font-medium">Última llamada</th>
                <th className="px-4 py-3 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-muted">
                    No hay prospectos que coincidan con los filtros.
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const ag = AGENTE_MAP[p.agente];
                const est = PROSPECTO_ESTADO[p.estado];
                const ori =
                  PROSPECTO_ORIGEN[p.origen ?? "manual"] ??
                  PROSPECTO_ORIGEN.manual;
                const pri =
                  PROSPECTO_PRIORIDAD[p.prioridad ?? 2] ??
                  PROSPECTO_PRIORIDAD[2];
                const enCurso = p.estado === "llamando";
                const llamando = callingId === p.id;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-border/60 transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.nombre ?? "—"}</div>
                      {p.empresa && (
                        <div className="text-xs text-muted">{p.empresa}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted">
                      {p.telefono}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={ag?.label ?? p.agente}
                        color={ag?.color ?? "#8888a0"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={`${ori.emoji} ${ori.label}`} color={ori.color} />
                    </td>
                    <td className="px-4 py-3">
                      {est && <Badge label={est.label} color={est.color} />}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span style={{ color: pri.color }} className="font-medium">
                        {pri.emoji} {pri.label}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-xs text-muted">
                      <span className="line-clamp-2">{p.dolor ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {p.intentos}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatDateTime(p.ultima_llamada)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setTarget(p)}
                        disabled={enCurso || llamando}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-g/15 px-3 py-1.5 text-xs font-medium text-g transition-colors hover:bg-g/25 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {llamando ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Llamando…
                          </>
                        ) : enCurso ? (
                          "En curso"
                        ) : (
                          <>
                            <Phone className="h-3.5 w-3.5" />
                            Llamar
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        {filtered.length} {filtered.length === 1 ? "prospecto" : "prospectos"}
        {agente !== "all" || estado !== "all" || q ? " (filtrados)" : ""}
      </p>

      {/* Modal: añadir prospecto */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !saving && setShowAdd(false)}
        >
          <form
            onSubmit={guardarProspecto}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                Añadir prospecto
              </h2>
              <button
                type="button"
                onClick={() => !saving && setShowAdd(false)}
                className="text-muted transition-colors hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mt-5 block text-xs font-medium text-muted">
              Nombre del contacto
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text outline-none focus:border-p"
                placeholder="María García"
              />
            </label>

            <label className="mt-4 block text-xs font-medium text-muted">
              Empresa
              <input
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text outline-none focus:border-p"
                placeholder="Clínica Dental García"
              />
            </label>

            <label className="mt-4 block text-xs font-medium text-muted">
              Teléfono *
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                inputMode="tel"
                className="mt-1.5 w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text outline-none focus:border-p"
                placeholder="+34 600 000 000"
              />
            </label>

            <label className="mt-4 block text-xs font-medium text-muted">
              Sector *
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value as Agente)}
                className="mt-1.5 w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text outline-none focus:border-p"
              >
                {AGENTES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} · {a.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-xs font-medium text-muted">
              Notas
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                className="mt-1.5 w-full resize-none rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text outline-none focus:border-p"
                placeholder="Opcional…"
              />
            </label>

            {addError && (
              <p className="mt-4 rounded-lg border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 px-3 py-2 text-xs text-[#ff9b9b]">
                {addError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !saving && setShowAdd(false)}
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:text-text disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-p px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-p2 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmación de llamada real */}
      <ConfirmDialog
        open={target !== null}
        title="Lanzar llamada"
        confirmLabel="Llamar ahora"
        onCancel={() => setTarget(null)}
        onConfirm={confirmarLlamada}
        message={
          target && (
            <>
              Se lanzará una llamada real de Bland.ai con el agente{" "}
              <span className="font-medium text-text">
                {AGENTE_MAP[target.agente]?.label ?? target.agente}
              </span>{" "}
              a{" "}
              <span className="font-medium text-text">
                {target.nombre ?? "este prospecto"}
              </span>{" "}
              ({target.telefono}).
            </>
          )
        }
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md ${
            toast.type === "success"
              ? "border-g/30 bg-g/10 text-g"
              : "border-[#ff6b6b]/30 bg-[#ff6b6b]/10 text-[#ff9b9b]"
          }`}
        >
          {toast.type === "success" && (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span className="min-w-0">{toast.msg}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 shrink-0 opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
