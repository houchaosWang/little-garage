export function runTireGame(garage, customer, task, attachIdleHelp) {
  return new Promise(res => setTimeout(() => res({ errors: 0, helps: 0 }), 1500));
}
