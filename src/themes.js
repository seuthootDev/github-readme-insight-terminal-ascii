function macPrompt(user) {
  return [
    { text: `${user}@MacBook-Pro`, fill: MAC_PALETTE.green },
    { text: " ", fill: MAC_PALETTE.fg },
    { text: "github-cli", fill: MAC_PALETTE.blue },
    { text: " % ", fill: MAC_PALETTE.fg }
  ];
}

function ubuntuPrompt(user) {
  return [
    { text: `${user}@ubuntu`, fill: UBUNTU_PALETTE.green },
    { text: ":", fill: UBUNTU_PALETTE.fg },
    { text: `~/github/${user}`, fill: UBUNTU_PALETTE.blue },
    { text: "$ ", fill: UBUNTU_PALETTE.fg }
  ];
}

function windowsPrompt(user) {
  return [
    { text: "PS ", fill: WINDOWS_PALETTE.purple },
    { text: `C:\\GitHub\\${user}\\github-cli`, fill: WINDOWS_PALETTE.yellow },
    { text: "> ", fill: WINDOWS_PALETTE.fg }
  ];
}

// Per-OS color palettes shared by the cards: mac = One Dark + GitHub green,
// windows = PowerShell Campbell + blue, ubuntu = Tango + Ubuntu orange/aubergine.
function createPalette(colors) {
  return {
    ...colors,
    states: { open: colors.green, draft: colors.mute, merged: colors.purple, closed: colors.red }
  };
}

const MAC_PALETTE = createPalette({
  fg: "#c5c8c6", mute: "#8b949e", border: "#30363d", accent: "#3fb950",
  green: "#98c379", blue: "#61afef", yellow: "#e5c07b", purple: "#c678dd",
  cyan: "#56b6c2", red: "#e06c75", orange: "#f0883e",
  graph: ["#2d333b", "#0e4429", "#26a641", "#39d353"]
});

const WINDOWS_PALETTE = createPalette({
  fg: "#cccccc", mute: "#9a9a9a", border: "#26324a", accent: "#3b78ff",
  green: "#16c60c", blue: "#3b78ff", yellow: "#f9f1a5", purple: "#b4009e",
  cyan: "#61d6d6", red: "#e74856", orange: "#c19c00",
  graph: ["#1c2333", "#0c2d6b", "#2a6fdb", "#61d6d6"]
});

const UBUNTU_PALETTE = createPalette({
  fg: "#d3d7cf", mute: "#888a85", border: "#5e2750", accent: "#e95420",
  green: "#8ae234", blue: "#729fcf", yellow: "#fce94f", purple: "#ad7fa8",
  cyan: "#34e2e2", red: "#ef2929", orange: "#e95420",
  graph: ["#2d2d2d", "#5e2750", "#c34113", "#f0814f"]
});

export const THEMES = {
  mac: {
    palette: MAC_PALETTE,
    title: (user) => `${user} — zsh`,
    frameBg: "#292929",
    bodyBg: "#1e1e1e",
    headerBg: "#3a3a3a",
    text: MAC_PALETTE.fg,
    accentSuccess: MAC_PALETTE.green,
    prompt: macPrompt,
    command: (user) => `github-cli --user ${user} --theme mac`,
    controlsSvg: (x, y, scale = 1) => `
      <circle cx="${x}" cy="${y}" r="${6 * scale}" fill="#ff5f56" />
      <circle cx="${x + 20 * scale}" cy="${y}" r="${6 * scale}" fill="#ffbd2e" />
      <circle cx="${x + 40 * scale}" cy="${y}" r="${6 * scale}" fill="#27c93f" />
    `
  },
  windows: {
    palette: WINDOWS_PALETTE,
    title: () => "Windows PowerShell",
    frameBg: "#0c0c0c",
    bodyBg: "#0c0c0c",
    headerBg: "#2c2c2c",
    text: WINDOWS_PALETTE.fg,
    accentSuccess: WINDOWS_PALETTE.green,
    prompt: windowsPrompt,
    command: (user) => `github-cli --user ${user} --theme windows`,
    controlsSvg: (x, y, scale = 1) => `
      <text x="${x}" y="${y + 5 * scale}" font-size="${13 * scale}" text-anchor="middle" fill="${WINDOWS_PALETTE.fg}">&#x2500;</text>
      <text x="${x + 28 * scale}" y="${y + 5 * scale}" font-size="${13 * scale}" text-anchor="middle" fill="${WINDOWS_PALETTE.fg}">&#x25A1;</text>
      <text x="${x + 56 * scale}" y="${y + 5 * scale}" font-size="${13 * scale}" text-anchor="middle" fill="#e74856">&#x2715;</text>
    `
  },
  ubuntu: {
    palette: UBUNTU_PALETTE,
    title: (user) => `bash — ${user}@ubuntu: ~`,
    frameBg: "#1e1e1e",
    bodyBg: "#1e1e1e",
    headerBg: "#2d2d2d",
    text: UBUNTU_PALETTE.fg,
    accentSuccess: UBUNTU_PALETTE.green,
    prompt: ubuntuPrompt,
    command: (user) => `./github-cli --target=${user}`,
    controlsSvg: (x, y, scale = 1) => `
      <circle cx="${x}" cy="${y}" r="${7 * scale}" fill="#5a5a5a" />
      <circle cx="${x + 22 * scale}" cy="${y}" r="${7 * scale}" fill="#5a5a5a" />
      <circle cx="${x + 44 * scale}" cy="${y}" r="${7 * scale}" fill="#e95420" />
    `
  }
};
