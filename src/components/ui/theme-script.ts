export const THEME_STORAGE_KEY = "cybernet.theme";

/** Inlined in <head>: applies the saved light/dark choice before first paint. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}})()`;
