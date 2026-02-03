#!/usr/bin/env node

import meow from "meow";
import { askCommand } from "./commands/ask.js";
import { configCommand, configResetCommand } from "./commands/config.js";
import { findCommand } from "./commands/find.js";
import { foldersCommand } from "./commands/folders.js";
import { initCommand } from "./commands/init.js";
import { syncCommand } from "./commands/sync.js";

// CLI flags for ask command
export interface AskFlags {
  folder?: string;
  limit?: number;
  sync?: boolean;
  sources?: boolean;
  noStream?: boolean;
  plain?: boolean;
}

const cli = meow(
  `
  Usage
    $ vault <command> [options]

  Commands
    init              Interactive setup wizard
    ask <query>       Search your notes using semantic search
    find <query>      Find files and open in editor
    sync              Manually sync folders with Nia
    folders           Manage folders in search scope
    config            View or reset configuration

  Options for 'ask'
    -f, --folder <id>  Search specific folder only
    -s, --sync         Sync folders before searching
    -S, --sources      Include source citations in output
    -p, --plain        Output raw text without markdown formatting
    --no-stream        Disable streaming (wait for full response)

  Options for 'config'
    --reset           Delete configuration file

  Global Options
    -h, --help        Show help
    -v, --version     Show version number

  Examples
    $ vault init
    $ vault ask "What are my notes about project planning?"
    $ vault sync
    $ vault folders
    $ vault config
    $ vault config --reset
`,
  {
    importMeta: import.meta,
    flags: {
      folder: {
        type: "string",
        shortFlag: "f",
      },
      limit: {
        type: "number",
        shortFlag: "l",
      },
      sync: {
        type: "boolean",
        shortFlag: "s",
      },
      sources: {
        type: "boolean",
        shortFlag: "S",
      },
      noStream: {
        type: "boolean",
        default: false,
      },
      plain: {
        type: "boolean",
        shortFlag: "p",
      },
      reset: {
        type: "boolean",
      },
      help: {
        type: "boolean",
        shortFlag: "h",
      },
      version: {
        type: "boolean",
        shortFlag: "v",
      },
    },
  },
);

async function main(): Promise<void> {
  const [command, ...args] = cli.input;

  if (!command || cli.flags.help) {
    cli.showHelp();
    return;
  }

  switch (command) {
    case "init":
      await initCommand();
      break;

    case "ask": {
      const query = args.join(" ");
      const askFlags: AskFlags = {
        folder: cli.flags.folder,
        limit: cli.flags.limit,
        sync: cli.flags.sync,
        sources: cli.flags.sources,
        noStream: cli.flags.noStream,
        plain: cli.flags.plain,
      };
      await askCommand(query, askFlags);
      break;
    }

    case "find": {
      const findQuery = args.join(" ");
      await findCommand(findQuery);
      break;
    }

    case "sync":
      await syncCommand();
      break;

    case "folders":
      await foldersCommand();
      break;

    case "config":
      if (cli.flags.reset) {
        await configResetCommand();
      } else {
        await configCommand();
      }
      break;

    default:
      console.log(`Unknown command: ${command}\n`);
      cli.showHelp();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("An unexpected error occurred:", error.message);
  process.exit(1);
});
