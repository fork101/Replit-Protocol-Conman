# Conman CLI

A conman, otherwise known as a container manager, allows an individual to make commands to a remote system from a client interface

As mentioned in the Replit protocol docs there is a conman repl, however the location of this is unknown. The interface is visible in the docs:

```shell
> files { write: { path: "foo.txt", content: "bar" } }
(files) { ok: {} }
...
```

Commands can be issued via `>[channel] [cmdJSON]` and channels opened via `.open [channel]`. To attach to a channel with command listeners run `.attach [channel]`. With this knowledge we can construct a conman client via CLI!

## Final Product

-   **LANG**: NodeJS w/ ESM
-   **PACKAGER**: yarn
-   **Final Product**: conman-replit.exe

## Goals

-   [x] create a CLI interface
-   [ ] create a Repl to connect to via CLI
-   [x] launch connection to a Repl via Crosis
-   [x] create reusable channel interface (class struct?)
-   [x] issue (conman) commands via CLI
    -   [x] <ins>`.open [channel]`</ins> - opens a channel with the current client; writes to stdout when fired
    -   [x] <ins>`.attach [channel]`</ins> - attach a command listener that blocks stdin and writes to stdout when fired
    -   [x] <ins>`[channel] [cmdJSON]`</ins> - send a command with the current client; create channel if not yet created; if known to resond use requests otherwise send and timeout; block stdin until "Stopped" state (or equivalent) or "{ ok: {} }" message (or equivalent)
    -   [x] <ins>`.close [channel`</ins> - close a channel and kill event listeners after closed
-   [ ] boil down code into platform-specific executables and create conman Repl template
-   [ ] document code and commands
-   [ ] share project with everyone

## Progress

<ins>11/07/2021</ins>

I created a new Nix repl configured with NodeJS 16 and Yarn. I was able to reuse a lot of base code (configs, utils, etc.) from [crosis4furrets](https://github.com/RayhanADev/crosis4furrets) to kick the project off. I pushed my focused to the channel interface and decided to create another Crosis abstraction to aid development of the CLI. I trimmed the code from crosis4furrets down to connection, channel, and command functions that use the `connect.sid` authentication method to get GovalMetadata.

<ins>11/08/2021</ins>

Today I fixed up a few of the commands and dropped in base code to create a simple CLI that uses the readline built-in module.

<ins>11/09/2021</ins>

I changed the readline CLI to use a mutable stdout so I can traffic light when event emitters from the `.attach [channel]` method and console input are displayed. I added commands with a switch/case in the readline CLI, implementing:

-   `.login [token]` (NOTE: can use the REPLIT_TOKEN env)
-   `.connect [replID]` (NOTE: was previously `.open [replID]` and can use the REPLIT_ID env)
-   `[channel] [cmdJSON]`
-   `.attach [channel]`
-   `.detach [channel]`
-   `.clear`
-   `.close`
-   and `.exit`.

All the commands function as intended, and the current setup allows me to connect to a remote Repl and issue commands. There is a small readline bug that occurs immediately after attaching to a channel due to the scrollback being sent. This could be addressed by muting the stdout when the command is started. I also added a timeout to commands (3 seconds) so that those without a response won't block the CLI. The timeout can be changed with the REPLIT_TIMEOUT env.

At this point, I've created a minimum viable product.
