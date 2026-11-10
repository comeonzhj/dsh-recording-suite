/**
 * Panel styles. Every color comes from DSH theme tokens (`--dsw-alias-*`), so
 * the panel follows light/dark themes and brand overrides without separate CSS.
 */
export const PANEL_STYLE_ID = 'dsh-recording-suite'

export const PANEL_CSS = `
.dsh-rec { display:flex; flex-direction:column; gap:0; height:100%; min-height:0; box-sizing:border-box; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-base); font-size:13px; line-height:1.5; }
.dsh-rec *, .dsh-rec *::before, .dsh-rec *::after { box-sizing:border-box; }
.dsh-rec button, .dsh-rec input, .dsh-rec select, .dsh-rec textarea { font:inherit; color:inherit; }
.dsh-rec h1, .dsh-rec h2, .dsh-rec h3, .dsh-rec p { margin:0; }
.dsh-rec svg { flex:none; display:block; }

.dsh-rec-head { flex:none; display:flex; flex-wrap:wrap; align-items:center; gap:12px 16px; padding:20px 28px 14px; border-bottom:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-1); }
.dsh-rec-mark { width:40px; height:40px; border-radius:11px; display:grid; place-items:center; background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, var(--dsw-alias-bg-layer-2)); color:var(--dsw-alias-brand-primary); border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, var(--dsw-alias-border-l2)); }
.dsh-rec-head-copy { min-width:0; flex:1 1 260px; }
.dsh-rec-title { font-size:18px; font-weight:650; letter-spacing:-0.01em; }
.dsh-rec-sub { margin-top:3px; font-size:12px; color:var(--dsw-alias-label-secondary); overflow-wrap:anywhere; }
.dsh-rec-head-meta { display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
.dsh-rec-chip { display:inline-flex; align-items:center; gap:5px; max-width:min(340px,100%); padding:2px 9px; border-radius:999px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dsh-rec-chip.is-ok { color:var(--dsw-alias-state-success-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 34%, var(--dsw-alias-border-l2)); }
.dsh-rec-chip.is-warn { color:var(--dsw-alias-state-warn-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 34%, var(--dsw-alias-border-l2)); }
.dsh-rec-chip.is-error { color:var(--dsw-alias-state-error-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 34%, var(--dsw-alias-border-l2)); }

.dsh-rec-tabs { flex:none; display:flex; gap:4px; padding:10px 28px; border-bottom:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-1); overflow-x:auto; }
.dsh-rec-tab { flex:none; display:inline-flex; align-items:center; gap:6px; padding:6px 13px; border-radius:8px; border:1px solid transparent; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; font-size:12.5px; font-weight:550; white-space:nowrap; }
.dsh-rec-tab:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
.dsh-rec-tab:focus-visible { outline:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent); outline-offset:1px; }
.dsh-rec-tab[aria-selected="true"] { background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, var(--dsw-alias-bg-layer-2)); border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, var(--dsw-alias-border-l2)); color:var(--dsw-alias-label-primary); }

.dsh-rec-body { flex:1; min-height:0; overflow:auto; padding:20px 28px 28px; }
.dsh-rec-stack { display:flex; flex-direction:column; gap:14px; min-width:0; }
.dsh-rec-row { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.dsh-rec-row-end { margin-left:auto; }
.dsh-rec-grid-2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:10px; }

.dsh-rec-card { border:1px solid var(--dsw-alias-border-l2); border-radius:12px; background:var(--dsw-alias-bg-layer-1); padding:16px; min-width:0; }
.dsh-rec-card-head { display:flex; flex-wrap:wrap; align-items:center; gap:8px 12px; margin-bottom:12px; }
.dsh-rec-card-title { display:flex; align-items:center; gap:7px; font-size:13.5px; font-weight:650; }
.dsh-rec-card-title svg { color:var(--dsw-alias-brand-primary); }
.dsh-rec-subtle { color:var(--dsw-alias-label-secondary); font-size:12px; }
.dsh-rec-mono { font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace); font-size:11.5px; overflow-wrap:anywhere; }
.dsh-rec-empty { display:flex; flex-direction:column; align-items:center; gap:6px; padding:36px 20px; text-align:center; color:var(--dsw-alias-label-secondary); }
.dsh-rec-empty-title { font-size:14px; font-weight:600; color:var(--dsw-alias-label-primary); }
.dsh-rec-empty-hint { font-size:12px; max-width:520px; }
.dsh-rec-alert { display:flex; align-items:flex-start; gap:8px; padding:10px 12px; border-radius:9px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); font-size:12px; }
.dsh-rec-alert svg { margin-top:1px; }
.dsh-rec-alert.is-error { border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 42%, var(--dsw-alias-border-l2)); background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, var(--dsw-alias-bg-layer-1)); }
.dsh-rec-alert.is-warn { border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 42%, var(--dsw-alias-border-l2)); background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, var(--dsw-alias-bg-layer-1)); }
.dsh-rec-alert.is-success { border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 42%, var(--dsw-alias-border-l2)); background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 8%, var(--dsw-alias-bg-layer-1)); }
.dsh-rec-alert-body { min-width:0; flex:1; }
.dsh-rec-alert-title { font-weight:600; }
.dsh-rec-alert-hint { color:var(--dsw-alias-label-secondary); margin-top:2px; }

.dsh-rec-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:6px 12px; border-radius:8px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); cursor:pointer; font-size:12.5px; font-weight:550; white-space:nowrap; }
.dsh-rec-btn:hover:enabled { background:var(--dsw-alias-interactive-bg-hover); border-color:var(--dsw-alias-border-l3); }
.dsh-rec-btn:active:enabled { background:var(--dsw-alias-interactive-bg-active); }
.dsh-rec-btn:focus-visible { outline:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent); outline-offset:1px; }
.dsh-rec-btn:disabled { opacity:.5; cursor:not-allowed; }
.dsh-rec-btn.is-primary { background:var(--dsw-alias-button-primary-fill); color:var(--dsw-alias-label-primary-foreground); border-color:transparent; }
.dsh-rec-btn.is-primary:hover:enabled { background:color-mix(in srgb, var(--dsw-alias-button-primary-fill) 86%, var(--dsw-alias-label-primary)); border-color:transparent; }
.dsh-rec-btn.is-danger { color:var(--dsw-alias-state-error-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, var(--dsw-alias-border-l2)); background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 6%, var(--dsw-alias-bg-layer-2)); }
.dsh-rec-btn.is-danger:hover:enabled { background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, var(--dsw-alias-bg-layer-2)); }
.dsh-rec-btn.is-ghost { background:transparent; border-color:transparent; color:var(--dsw-alias-label-secondary); }
.dsh-rec-btn.is-ghost:hover:enabled { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
.dsh-rec-btn.is-sm { padding:3px 8px; font-size:11.5px; border-radius:7px; }

.dsh-rec-input, .dsh-rec-select, .dsh-rec-textarea { width:100%; min-width:0; padding:6px 10px; border-radius:8px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary); font-size:12.5px; }
.dsh-rec-input:focus, .dsh-rec-select:focus, .dsh-rec-textarea:focus { outline:none; border-color:var(--dsw-alias-brand-primary); box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 20%, transparent); }
.dsh-rec-input::placeholder, .dsh-rec-textarea::placeholder { color:var(--dsw-alias-label-tertiary); }
.dsh-rec-textarea { resize:vertical; min-height:64px; }
.dsh-rec-field { display:flex; flex-direction:column; gap:5px; min-width:0; }
.dsh-rec-field-label { font-size:12px; font-weight:550; color:var(--dsw-alias-label-primary); }
.dsh-rec-field-hint { font-size:11px; color:var(--dsw-alias-label-secondary); }
.dsh-rec-check { display:inline-flex; align-items:center; gap:7px; cursor:pointer; font-size:12.5px; }
.dsh-rec-check input { width:15px; height:15px; accent-color:var(--dsw-alias-brand-primary); }

.dsh-rec-badge { display:inline-flex; align-items:center; gap:4px; padding:1px 7px; border-radius:999px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); font-size:10.5px; white-space:nowrap; }
.dsh-rec-badge.is-done { color:var(--dsw-alias-state-success-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 32%, var(--dsw-alias-border-l2)); }
.dsh-rec-badge.is-running { color:var(--dsw-alias-state-business-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 32%, var(--dsw-alias-border-l2)); }
.dsh-rec-badge.is-failed { color:var(--dsw-alias-state-error-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 32%, var(--dsw-alias-border-l2)); }
.dsh-rec-badge.is-queued { color:var(--dsw-alias-state-warn-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 32%, var(--dsw-alias-border-l2)); }

.dsh-rec-lib { display:grid; grid-template-columns:minmax(280px,0.9fr) minmax(360px,1.4fr); gap:14px; align-items:stretch; min-height:0; }
.dsh-rec-lib-list { display:flex; flex-direction:column; min-height:0; border:1px solid var(--dsw-alias-border-l2); border-radius:12px; background:var(--dsw-alias-bg-layer-1); overflow:hidden; }
.dsh-rec-lib-toolbar { flex:none; display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-1); }
.dsh-rec-lib-scroll { flex:1; min-height:220px; overflow:auto; padding:6px; display:flex; flex-direction:column; gap:4px; }
.dsh-rec-item { display:flex; flex-direction:column; gap:3px; width:100%; text-align:left; padding:9px 10px; border-radius:8px; border:1px solid transparent; background:transparent; color:inherit; cursor:pointer; }
.dsh-rec-item:hover { background:var(--dsw-alias-interactive-bg-hover); }
.dsh-rec-item[aria-current="true"] { background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, var(--dsw-alias-bg-layer-2)); border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 26%, var(--dsw-alias-border-l2)); }
.dsh-rec-item-top { display:flex; align-items:center; gap:7px; min-width:0; }
.dsh-rec-item-title { flex:1; min-width:0; font-weight:600; font-size:12.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsh-rec-item-meta { display:flex; flex-wrap:wrap; gap:4px 9px; color:var(--dsw-alias-label-secondary); font-size:11px; }
.dsh-rec-item-snippet { color:var(--dsw-alias-label-secondary); font-size:11.5px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; overflow-wrap:anywhere; }

.dsh-rec-detail { display:flex; flex-direction:column; min-width:0; border:1px solid var(--dsw-alias-border-l2); border-radius:12px; background:var(--dsw-alias-bg-layer-1); overflow:hidden; }
.dsh-rec-detail-head { flex:none; padding:14px 16px; border-bottom:1px solid var(--dsw-alias-border-l2); display:flex; flex-direction:column; gap:9px; }
.dsh-rec-detail-title-row { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.dsh-rec-detail-title { flex:1 1 220px; min-width:0; font-size:15px; font-weight:650; overflow-wrap:anywhere; }
.dsh-rec-detail-scroll { flex:1; min-height:0; overflow:auto; padding:14px 16px; display:flex; flex-direction:column; gap:14px; }
.dsh-rec-meta-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px 14px; }
.dsh-rec-meta-item { min-width:0; }
.dsh-rec-meta-label { font-size:10.5px; color:var(--dsw-alias-label-secondary); letter-spacing:.02em; }
.dsh-rec-meta-value { font-size:12px; overflow-wrap:anywhere; }
.dsh-rec-audio { width:100%; height:38px; }

.dsh-rec-transcript { border:1px solid var(--dsw-alias-border-l2); border-radius:10px; background:var(--dsw-alias-bg-base); overflow:hidden; }
.dsh-rec-transcript-head { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); }
.dsh-rec-transcript-title { flex:1; min-width:120px; font-size:12px; font-weight:600; }
.dsh-rec-transcript-body { margin:0; padding:12px; max-height:420px; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere; font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace); font-size:12.5px; line-height:1.65; color:var(--dsw-alias-label-primary); }
.dsh-rec-hintbox { display:flex; gap:8px; align-items:flex-start; padding:9px 11px; border-radius:9px; background:var(--dsw-alias-bg-layer-2); border:1px dashed var(--dsw-alias-border-l2); color:var(--dsw-alias-label-secondary); font-size:11.5px; }
.dsh-rec-hintbox svg { color:var(--dsw-alias-brand-primary); margin-top:1px; }

.dsh-rec-progress { height:7px; border-radius:999px; background:var(--dsw-alias-bg-layer-2); overflow:hidden; border:1px solid var(--dsw-alias-border-l2); }
.dsh-rec-progress > i { display:block; height:100%; border-radius:999px; background:var(--dsw-alias-brand-primary); transition:width .25s ease; }
.dsh-rec-progress-row { display:flex; align-items:center; gap:10px; }
.dsh-rec-progress-row .dsh-rec-progress { flex:1; min-width:80px; }
.dsh-rec-progress-text { flex:none; font-size:11.5px; color:var(--dsw-alias-label-secondary); font-variant-numeric:tabular-nums; }

.dsh-rec-table { width:100%; border-collapse:collapse; font-size:12px; }
.dsh-rec-table th, .dsh-rec-table td { text-align:left; padding:7px 8px; border-bottom:1px solid var(--dsw-alias-border-l2); vertical-align:middle; }
.dsh-rec-table th { font-size:10.5px; font-weight:600; color:var(--dsw-alias-label-secondary); text-transform:uppercase; letter-spacing:.03em; white-space:nowrap; }
.dsh-rec-table tr:last-child td { border-bottom:0; }
.dsh-rec-table tbody tr:hover { background:var(--dsw-alias-interactive-bg-hover); }
.dsh-rec-table .is-num { font-variant-numeric:tabular-nums; white-space:nowrap; }
.dsh-rec-table .is-actions { text-align:right; white-space:nowrap; }
.dsh-rec-file-row.is-busy { opacity:.6; }

.dsh-rec-log { max-height:200px; overflow:auto; padding:10px 12px; border-radius:9px; background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l2); font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace); font-size:11px; line-height:1.6; }
.dsh-rec-log-line { display:flex; gap:8px; }
.dsh-rec-log-time { flex:none; color:var(--dsw-alias-label-tertiary); }
.dsh-rec-log-line.is-error { color:var(--dsw-alias-state-error-primary); }

.dsh-rec-settings { display:flex; flex-direction:column; gap:14px; max-width:860px; }
.dsh-rec-form-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
.dsh-rec-kv { display:grid; grid-template-columns:auto minmax(0,1fr); gap:6px 12px; font-size:12px; align-items:baseline; }
.dsh-rec-kv dt { color:var(--dsw-alias-label-secondary); white-space:nowrap; }
.dsh-rec-kv dd { margin:0; overflow-wrap:anywhere; }
.dsh-rec-copy-line { display:flex; align-items:center; gap:8px; min-width:0; }
.dsh-rec-copy-line .dsh-rec-input { flex:1; }

.dsh-rec-toast { position:sticky; bottom:0; z-index:2; align-self:center; margin-top:auto; padding:7px 14px; border-radius:999px; border:1px solid var(--dsw-alias-border-l3); background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary); font-size:12px; box-shadow:0 4px 14px color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent); }

.dsh-rec-spinner { width:14px; height:14px; border-radius:50%; border:2px solid color-mix(in srgb, var(--dsw-alias-label-secondary) 35%, transparent); border-top-color:var(--dsw-alias-brand-primary); animation:dsh-rec-spin .8s linear infinite; }
@keyframes dsh-rec-spin { to { transform:rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .dsh-rec-spinner { animation:none; } .dsh-rec-progress > i { transition:none; } }

@media (max-width: 900px) {
  .dsh-rec-head, .dsh-rec-tabs { padding-left:16px; padding-right:16px; }
  .dsh-rec-body { padding:14px 16px 20px; }
  .dsh-rec-lib { grid-template-columns:minmax(0,1fr); }
}
`
