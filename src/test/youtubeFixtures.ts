export const youtubeWatchHtml = `
  <html>
    <head><title>AI Talk - YouTube</title></head>
    <body>
      <h1><yt-formatted-string>AI Workflow Talk</yt-formatted-string></h1>
      <ytd-channel-name><a>Example Channel</a></ytd-channel-name>
      <ytd-transcript-segment-renderer>
        <div class="segment-timestamp">0:03</div>
        <yt-formatted-string class="segment-text">AI systems change workflows.</yt-formatted-string>
      </ytd-transcript-segment-renderer>
      <ytd-transcript-segment-renderer>
        <div class="segment-timestamp">0:12</div>
        <yt-formatted-string class="segment-text">Human review remains important.</yt-formatted-string>
      </ytd-transcript-segment-renderer>
    </body>
  </html>
`;

export const visibleTranscriptHtml = `
  <ytd-transcript-segment-renderer>
    <div class="segment-timestamp">0:03</div>
    <yt-formatted-string class="segment-text">AI systems change workflows.</yt-formatted-string>
  </ytd-transcript-segment-renderer>
  <ytd-transcript-segment-renderer>
    <div class="segment-timestamp">0:12</div>
    <yt-formatted-string class="segment-text">Human review remains important.</yt-formatted-string>
  </ytd-transcript-segment-renderer>
`;

export const chineseTranscriptButtonHtml = `
  <button data-testid="more-button">更多</button>
  <section>
    <h3>转写文稿</h3>
  </section>
`;

export const englishTranscriptButtonHtml = `
  <button data-testid="more-button">More</button>
  <section>
    <h3>Transcript</h3>
  </section>
`;

export const noTranscriptHtml = `
  <button data-testid="more-button">More</button>
  <section><h3>Description</h3><p>No transcript here.</p></section>
`;
