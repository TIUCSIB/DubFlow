export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side: suppress script tag warning
    const originalError = console.error;
    console.error = function (...args: unknown[]) {
      if (
        typeof args[0] === "string" &&
        args[0].includes("Encountered a script tag")
      ) {
        return;
      }
      originalError.apply(console, args);
    };
  }

  if (process.env.NEXT_RUNTIME === "browser" || !process.env.NEXT_RUNTIME) {
    // Client-side: patch as early as possible
    const originalError = console.error;
    console.error = function (...args: unknown[]) {
      if (
        typeof args[0] === "string" &&
        args[0].includes("Encountered a script tag")
      ) {
        return;
      }
      originalError.apply(console, args);
    };
  }
}
