export const INLINE_PANEL_CSS = `
#video-insight-inline-root {
  color: #172033;
  background: #f6f7fb;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  margin: 0 0 16px;
  border: 1px solid #dbe1ec;
  border-radius: 8px;
  overflow: hidden;
}

#video-insight-inline-root,
#video-insight-inline-root button,
#video-insight-inline-root input,
#video-insight-inline-root select,
#video-insight-inline-root textarea {
  box-sizing: border-box;
}

#video-insight-inline-root button,
#video-insight-inline-root input,
#video-insight-inline-root select,
#video-insight-inline-root textarea {
  font: inherit;
}

#video-insight-inline-root .app-shell {
  min-height: 0;
  padding: 16px;
}

#video-insight-inline-root .inline-panel-shell {
  --inline-panel-font-size: 15px;
  --inline-panel-title-size: 20px;
  --inline-panel-card-title-size: 16px;
}

#video-insight-inline-root .inline-panel-shell[data-inline-font-size="small"] {
  --inline-panel-font-size: 13px;
  --inline-panel-title-size: 18px;
  --inline-panel-card-title-size: 15px;
}

#video-insight-inline-root .inline-panel-shell[data-inline-font-size="default"] {
  --inline-panel-font-size: 14px;
  --inline-panel-title-size: 19px;
  --inline-panel-card-title-size: 16px;
}

#video-insight-inline-root .inline-panel-shell[data-inline-font-size="large"] {
  --inline-panel-font-size: 15px;
  --inline-panel-title-size: 20px;
  --inline-panel-card-title-size: 17px;
}

#video-insight-inline-root .inline-panel-shell[data-inline-font-size="xl"] {
  --inline-panel-font-size: 16px;
  --inline-panel-title-size: 21px;
  --inline-panel-card-title-size: 18px;
}

#video-insight-inline-root .inline-panel-body {
  max-height: min(720px, calc(100vh - 164px));
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-gutter: stable;
  font-size: var(--inline-panel-font-size);
}

#video-insight-inline-root .inline-panel-body::-webkit-scrollbar {
  width: 10px;
}

#video-insight-inline-root .inline-panel-body::-webkit-scrollbar-thumb {
  border: 3px solid #f6f7fb;
  border-radius: 999px;
  background: #b9c3d4;
}

#video-insight-inline-root .app-header {
  position: relative;
  min-height: 38px;
  padding-right: 78px;
}

#video-insight-inline-root .app-header h1 {
  margin: 0;
  font-size: var(--inline-panel-title-size, 20px);
}

#video-insight-inline-root .app-header p {
  margin: 6px 0 0;
  color: #5d6678;
  line-height: 1.45;
}

#video-insight-inline-root .inline-panel-controls {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  display: flex;
  gap: 6px;
}

#video-insight-inline-root .inline-panel-shell[data-inline-collapsed="true"][data-settings-open="true"] {
  padding-bottom: 152px;
}

#video-insight-inline-root .inline-header-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  min-width: 34px;
  height: 34px;
  min-height: 34px;
  border: 0;
  border-radius: 999px;
  background: #f2f2f2;
  color: #0f0f0f;
  cursor: pointer;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  padding: 0;
}

#video-insight-inline-root .inline-header-icon-button:hover,
#video-insight-inline-root .inline-header-icon-button[aria-expanded="true"] {
  background: #e5e5e5;
}

#video-insight-inline-root .inline-settings-menu {
  position: absolute;
  top: 38px;
  right: 0;
  width: 208px;
  border: 1px solid #d7deeb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(23, 32, 51, 0.16);
  padding: 10px;
}

#video-insight-inline-root .settings-menu-section {
  display: grid;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid #edf1f7;
}

#video-insight-inline-root .settings-menu-label {
  color: #5d6678;
  font-size: 12px;
  font-weight: 700;
}

#video-insight-inline-root .inline-result-actions {
  position: sticky;
  right: 10px;
  bottom: 10px;
  justify-self: end;
  display: flex;
  gap: 8px;
  width: max-content;
  margin: 14px 0 0 auto;
  border: 0;
  background: transparent;
  box-shadow: none;
  padding: 0;
}

#video-insight-inline-root .inline-result-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  min-width: 34px;
  height: 34px;
  min-height: 34px;
  border: 0;
  border-radius: 999px;
  background: #f2f2f2;
  color: #0f0f0f;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  padding: 0;
  line-height: 1;
}

#video-insight-inline-root .inline-result-actions button:hover:not(:disabled) {
  background: #e5e5e5;
}

#video-insight-inline-root .inline-result-actions button:disabled {
  background: #f1f1f1;
  color: #909090;
  cursor: not-allowed;
}

#video-insight-inline-root .settings-menu-action {
  width: 100%;
  min-height: 34px;
  border: 1px solid #cbd3e1;
  border-radius: 6px;
  background: #f8fafc;
  color: #172033;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

#video-insight-inline-root .visually-hidden-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

#video-insight-inline-root .panel-section {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

#video-insight-inline-root .form-control {
  display: grid;
  gap: 6px;
  color: #313b4f;
  font-size: 13px;
  font-weight: 600;
}

#video-insight-inline-root .form-control select {
  width: 100%;
  min-height: 38px;
  border: 1px solid #cbd3e1;
  border-radius: 6px;
  background: #fff;
  color: #172033;
  padding: 8px 10px;
}

#video-insight-inline-root .transcript-tip {
  border: 1px solid #d9e4f5;
  border-radius: 6px;
  background: #f7fbff;
  color: #315176;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.4;
}

#video-insight-inline-root .content-tabs-section {
  gap: 10px;
}

#video-insight-inline-root .content-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  border-radius: 8px;
  background: #e9edf4;
  padding: 4px;
}

#video-insight-inline-root .content-tabs button {
  min-height: 34px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #4d586c;
  cursor: pointer;
  font-weight: 700;
}

#video-insight-inline-root .content-tabs button[aria-selected="true"] {
  background: #fff;
  color: #172033;
  box-shadow: 0 1px 3px rgba(23, 32, 51, 0.12);
}

#video-insight-inline-root .content-tabs-section [role="tabpanel"] > .panel-section {
  margin-top: 0;
}

#video-insight-inline-root .primary-button,
#video-insight-inline-root .secondary-button,
#video-insight-inline-root .notice button {
  min-height: 38px;
  border-radius: 6px;
  padding: 8px 12px;
  font-weight: 700;
  cursor: pointer;
}

#video-insight-inline-root .primary-button {
  width: 100%;
  border: 0;
  background: #2457d6;
  color: #fff;
}

#video-insight-inline-root .secondary-button {
  border: 1px solid #cbd3e1;
  background: #fff;
  color: #172033;
}

#video-insight-inline-root .primary-button:disabled {
  background: #98a5bd;
  cursor: not-allowed;
}

#video-insight-inline-root .notice,
#video-insight-inline-root .error-box,
#video-insight-inline-root .insight-card {
  border: 1px solid #dbe1ec;
  border-radius: 8px;
  background: #fff;
  padding: 14px;
}

#video-insight-inline-root .notice h2,
#video-insight-inline-root .insight-card h2 {
  margin: 0 0 8px;
  font-size: var(--inline-panel-card-title-size, 16px);
}

#video-insight-inline-root .notice p,
#video-insight-inline-root .insight-card p {
  margin: 0 0 12px;
  color: #4d586c;
  line-height: 1.5;
}

#video-insight-inline-root .notice button {
  background: #172033;
  color: #fff;
}

#video-insight-inline-root .error-box {
  margin-top: 14px;
  border-color: #f0b8b8;
  background: #fff4f4;
  color: #9f1d1d;
  line-height: 1.45;
}

#video-insight-inline-root .insight-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
  color: #2f3a4d;
  line-height: 1.5;
}

#video-insight-inline-root .insight-card summary {
  color: #172033;
  cursor: pointer;
  font-size: var(--inline-panel-card-title-size, 16px);
  font-weight: 700;
}

#video-insight-inline-root .insight-card pre {
  overflow-x: auto;
  margin: 0;
  border-radius: 6px;
  background: #f2f4f8;
  padding: 10px;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 720px) {
  #video-insight-inline-root .app-header {
    padding-right: 76px;
  }

  #video-insight-inline-root .inline-settings-menu {
    width: 196px;
  }
}
`;
