function macPrompt(user) {
  return [
    { text: `${user}@MacBook-Pro`, fill: "#98c379" },
    { text: " ", fill: "#c5c8c6" },
    { text: "github-grass", fill: "#61afef" },
    { text: " % ", fill: "#c5c8c6" }
  ];
}

function ubuntuPrompt(user) {
  return [
    { text: `${user}@ubuntu`, fill: "#98c379" },
    { text: ":", fill: "#c5c8c6" },
    { text: `~/github/${user}`, fill: "#61afef" },
    { text: "$ ", fill: "#c5c8c6" }
  ];
}

function windowsPrompt(user) {
  return [
    { text: "PS ", fill: "#c678dd" },
    { text: `C:\\GitHub\\${user}\\github-grass`, fill: "#e5c07b" },
    { text: "> ", fill: "#c5c8c6" }
  ];
}

export const THEMES = {
  mac: {
    title: (user) => `${user} — zsh`,
    frameBg: "#292929",
    bodyBg: "#1e1e1e",
    headerBg: "#3a3a3a",
    text: "#c5c8c6",
    accentSuccess: "#98c379",
    prompt: macPrompt,
    command: (user) => `github-grass --user ${user} --theme mac`,
    controlsSvg: (x, y) => `
      <circle cx="${x}" cy="${y}" r="6" fill="#ff5f56" />
      <circle cx="${x + 20}" cy="${y}" r="6" fill="#ffbd2e" />
      <circle cx="${x + 40}" cy="${y}" r="6" fill="#27c93f" />
    `
  },
  window: {
    title: () => "Windows PowerShell",
    frameBg: "#0c0c0c",
    bodyBg: "#0c0c0c",
    headerBg: "#2c2c2c",
    text: "#c5c8c6",
    accentSuccess: "#98c379",
    prompt: windowsPrompt,
    command: (user) => `github-grass --user ${user} --theme window`,
    controlsSvg: (x, y) => `
      <text x="${x}" y="${y + 5}" font-size="13" text-anchor="middle" fill="#c5c8c6">&#x2500;</text>
      <text x="${x + 28}" y="${y + 5}" font-size="13" text-anchor="middle" fill="#c5c8c6">&#x25A1;</text>
      <text x="${x + 56}" y="${y + 5}" font-size="13" text-anchor="middle" fill="#e74856">&#x2715;</text>
    `
  },
  ubuntu: {
    title: (user) => `bash — ${user}@ubuntu: ~`,
    frameBg: "#1e1e1e",
    bodyBg: "#1e1e1e",
    headerBg: "#2d2d2d",
    text: "#c5c8c6",
    accentSuccess: "#98c379",
    prompt: ubuntuPrompt,
    command: (user) => `./render_grass --target=${user}`,
    controlsSvg: (x, y) => `
      <circle cx="${x}" cy="${y}" r="7" fill="#5a5a5a" />
      <circle cx="${x + 22}" cy="${y}" r="7" fill="#5a5a5a" />
      <circle cx="${x + 44}" cy="${y}" r="7" fill="#e95420" />
    `
  }
};
