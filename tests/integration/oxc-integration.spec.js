import { describe, it, expect } from "vitest";
import { join } from "path";
import { existsSync, readFileSync, readdirSync } from "fs";

const root = process.cwd();

describe("Oxc 集成", () => {
  describe(".oxlintrc.json 配置", () => {
    it("应存在 oxlint 配置文件", () => {
      const configPath = join(root, ".oxlintrc.json");
      expect(existsSync(configPath)).toBe(true);
    });

    it("应是有效的 JSON", () => {
      const configPath = join(root, ".oxlintrc.json");
      const content = readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);
      expect(config).toBeDefined();
      expect(config.plugins).toBeInstanceOf(Array);
    });

    it("应启用 vue 插件", () => {
      const configPath = join(root, ".oxlintrc.json");
      const content = readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);
      expect(config.plugins).toContain("vue");
    });

    it("应启用 vitest 插件", () => {
      const configPath = join(root, ".oxlintrc.json");
      const content = readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);
      expect(config.plugins).toContain("vitest");
    });

    it("correctness 类别应设为 error", () => {
      const configPath = join(root, ".oxlintrc.json");
      const content = readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);
      expect(config.categories.correctness).toBe("error");
    });

    it("应包含 browser 和 node 环境", () => {
      const configPath = join(root, ".oxlintrc.json");
      const content = readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);
      expect(config.env.browser).toBe(true);
      expect(config.env.node).toBe(true);
    });

    it("应忽略构建输出目录", () => {
      const configPath = join(root, ".oxlintrc.json");
      const content = readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);
      expect(config.ignorePatterns).toContain("node_modules");
      expect(config.ignorePatterns).toContain("dist");
      expect(config.ignorePatterns).toContain("out");
    });
  });

  describe(".oxfmtrc.jsonc 配置", () => {
    it("应存在 oxfmt 配置文件", () => {
      const configPath = join(root, ".oxfmtrc.jsonc");
      expect(existsSync(configPath)).toBe(true);
    });

    it("应包含有效的 printWidth", () => {
      const configPath = join(root, ".oxfmtrc.jsonc");
      const content = readFileSync(configPath, "utf-8");
      // JSONC: 去除注释后解析
      const cleanContent = content.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      const config = JSON.parse(cleanContent);
      expect(config.printWidth).toBeGreaterThanOrEqual(80);
      expect(config.printWidth).toBeLessThanOrEqual(120);
    });

    it("应使用 LF 换行符", () => {
      const configPath = join(root, ".oxfmtrc.jsonc");
      const content = readFileSync(configPath, "utf-8");
      const cleanContent = content.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      const config = JSON.parse(cleanContent);
      expect(config.endOfLine).toBe("lf");
    });
  });

  describe("package.json scripts", () => {
    it("应包含 lint 命令", () => {
      const pkgPath = join(root, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      expect(pkg.scripts.lint).toBeDefined();
      expect(pkg.scripts.lint).toContain("oxlint");
    });

    it("应包含 lint:fix 命令", () => {
      const pkgPath = join(root, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      expect(pkg.scripts["lint:fix"]).toBeDefined();
      expect(pkg.scripts["lint:fix"]).toContain("oxlint");
      expect(pkg.scripts["lint:fix"]).toContain("--fix");
    });

    it("应包含 format 命令", () => {
      const pkgPath = join(root, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      expect(pkg.scripts.format).toBeDefined();
      expect(pkg.scripts.format).toContain("oxfmt");
    });

    it("应包含 format:check 命令", () => {
      const pkgPath = join(root, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      expect(pkg.scripts["format:check"]).toBeDefined();
      expect(pkg.scripts["format:check"]).toContain("oxfmt");
      expect(pkg.scripts["format:check"]).toContain("--check");
    });

    it("应包含 quality 组合命令", () => {
      const pkgPath = join(root, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      expect(pkg.scripts.quality).toBeDefined();
      expect(pkg.scripts.quality).toContain("lint");
      expect(pkg.scripts.quality).toContain("format:check");
      expect(pkg.scripts.quality).toContain("test");
    });

    it("应安装 oxlint 依赖", () => {
      const pkgPath = join(root, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      expect(pkg.devDependencies.oxlint).toBeDefined();
    });

    it("应安装 oxfmt 依赖", () => {
      const pkgPath = join(root, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      expect(pkg.devDependencies.oxfmt).toBeDefined();
    });
  });

  describe("代码规范合规", () => {
    it("所有 .vue 文件应包含 <script> 块", () => {
      const viewsDir = join(root, "src/renderer/src/views");
      const files = readdirSync(viewsDir).filter((f) => f.endsWith(".vue"));
      expect(files.length).toBeGreaterThan(0);

      for (const f of files) {
        const content = readFileSync(join(viewsDir, f), "utf-8");
        expect(content).toContain("<script");
      }
    });

    it("所有 Vue 组件应使用 setup 语法糖", () => {
      const viewsDir = join(root, "src/renderer/src/views");
      const files = readdirSync(viewsDir).filter((f) => f.endsWith(".vue"));

      for (const f of files) {
        const content = readFileSync(join(viewsDir, f), "utf-8");
        expect(content).toContain("<script setup");
      }
    });

    it("所有 Vue 组件应使用中文界面文本", () => {
      const viewsDir = join(root, "src/renderer/src/views");
      const files = readdirSync(viewsDir).filter((f) => f.endsWith(".vue"));
      let hasChinese = false;

      for (const f of files) {
        const content = readFileSync(join(viewsDir, f), "utf-8");
        if (/[\u4e00-\u9fff]/.test(content)) {
          hasChinese = true;
          break;
        }
      }
      expect(hasChinese).toBe(true);
    });
  });

  describe("pre-commit hook", () => {
    it("应安装 simple-git-hooks 依赖", () => {
      const pkgPath = join(root, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      expect(pkg.devDependencies["simple-git-hooks"]).toBeDefined();
    });

    it("应配置 pre-commit hook", () => {
      const pkgPath = join(root, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      expect(pkg["simple-git-hooks"]).toBeDefined();
      expect(pkg["simple-git-hooks"]["pre-commit"]).toBeDefined();
    });

    it("pre-commit hook 应包含 oxlint 检查", () => {
      const pkgPath = join(root, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const hook = pkg["simple-git-hooks"]["pre-commit"];
      expect(hook).toContain("oxlint");
    });

    it("pre-commit hook 应包含 oxfmt 格式检查", () => {
      const pkgPath = join(root, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const hook = pkg["simple-git-hooks"]["pre-commit"];
      expect(hook).toContain("oxfmt");
      expect(hook).toContain("--check");
    });

    it("postinstall 应配置 simple-git-hooks 初始化", () => {
      const pkgPath = join(root, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      expect(pkg.scripts.postinstall).toContain("simple-git-hooks");
    });
  });
});
