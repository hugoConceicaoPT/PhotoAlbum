import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // tests/api.test.ts and tests/upload.test.ts both exercise multer, whose temp directory is the
    // cwd-relative "uploads/", and assert that no temp file is left behind by counting that directory.
    // Run test files one at a time so one file's in-flight temp files cannot appear in the other's count.
    fileParallelism: false,
  },
});
