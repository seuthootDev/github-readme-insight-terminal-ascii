function macPrompt(user) {
  return [
    { text: `${user}@MacBook-Pro`, fill: "#98c379" },
    { text: " ", fill: "#c5c8c6" },
    { text: "github-cli", fill: "#61afef" },
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
    { text: `C:\\GitHub\\${user}\\github-cli`, fill: "#e5c07b" },
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
    command: (user) => `github-cli --user ${user} --theme mac`,
    controlsSvg: (x, y, scale = 1) => `
      <circle cx="${x}" cy="${y}" r="${6 * scale}" fill="#ff5f56" />
      <circle cx="${x + 20 * scale}" cy="${y}" r="${6 * scale}" fill="#ffbd2e" />
      <circle cx="${x + 40 * scale}" cy="${y}" r="${6 * scale}" fill="#27c93f" />
    `
  },
  windows: {
    title: () => "Windows PowerShell",
    frameBg: "#0c0c0c",
    bodyBg: "#0c0c0c",
    headerBg: "#2c2c2c",
    text: "#c5c8c6",
    accentSuccess: "#98c379",
    prompt: windowsPrompt,
    command: (user) => `github-cli --user ${user} --theme windows`,
    controlsSvg: (x, y, scale = 1) => `
      <text x="${x}" y="${y + 5 * scale}" font-size="${13 * scale}" text-anchor="middle" fill="#c5c8c6">&#x2500;</text>
      <text x="${x + 28 * scale}" y="${y + 5 * scale}" font-size="${13 * scale}" text-anchor="middle" fill="#c5c8c6">&#x25A1;</text>
      <text x="${x + 56 * scale}" y="${y + 5 * scale}" font-size="${13 * scale}" text-anchor="middle" fill="#e74856">&#x2715;</text>
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
    command: (user) => `./github-cli --target=${user}`,
    controlsSvg: (x, y, scale = 1) => `
      <circle cx="${x}" cy="${y}" r="${7 * scale}" fill="#5a5a5a" />
      <circle cx="${x + 22 * scale}" cy="${y}" r="${7 * scale}" fill="#5a5a5a" />
      <circle cx="${x + 44 * scale}" cy="${y}" r="${7 * scale}" fill="#e95420" />
    `
  }
};
