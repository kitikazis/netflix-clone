// `ffprobe-static` no publica tipos: exporta la ruta al binario de ffprobe.
declare module 'ffprobe-static' {
  const ffprobe: { path: string };
  export = ffprobe;
}
