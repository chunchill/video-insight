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

#video-insight-inline-root .app-header h1 {
  margin: 0;
  font-size: 20px;
}

#video-insight-inline-root .app-header p {
  margin: 6px 0 0;
  color: #5d6678;
  line-height: 1.45;
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

#video-insight-inline-root .primary-button,
#video-insight-inline-root .notice button {
  min-height: 38px;
  border: 0;
  border-radius: 6px;
  padding: 8px 12px;
  font-weight: 700;
  cursor: pointer;
}

#video-insight-inline-root .primary-button {
  width: 100%;
  background: #2457d6;
  color: #fff;
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
  font-size: 16px;
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
  font-size: 16px;
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
`;
