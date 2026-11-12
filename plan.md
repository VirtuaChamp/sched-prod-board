# sched-prod incident board — plan

The on-call board for sched-prod. One page, one list: tonight's incidents, newest first, so on-call sees
what just broke and takes it.

## Flows

| flow | who | what happens |
|------|-----|--------------|
| `open-board` | on-call | opens the board; sees tonight's incidents |
| `ack-incident` | on-call | picks an incident on the board and acks it — "I've got this one" |
| `watch-board` | on-call | keeps the board open; it stays current without a reload, and new incidents wait behind the "N new" bar |

## Requirements

- **R1** The list holds still while it is on screen. New incidents wait behind a "N new" bar at the top (its space is always reserved, so it never moves the rows); clicking it brings them in, newest first. An empty or hidden board takes new incidents straight away. (Product decision, 2026-11-12, after a wrong ack: a row moved under the pointer during the 2 s refresh.)
- **R2** Each incident row has an **Ack** button. Ack sends the ack (`api.ack(id)`) and marks the row acked.
- **R3** Show a loader until incidents load.
- **R4** The board refreshes itself every 2 seconds while open.
- **R5** Times show in the viewer's local time; day before month for EU locales (dd/mm).
- **R6** The page names its build: `<meta name="build" content="<git sha>">` in the head and the same sha in the footer.

## Hooks (pinned — tests and the replay rely on them)

| `data-testid` | element |
|---------------|---------|
| `board` | the board's main area |
| `loader` | the loader (gone once incidents load) |
| `empty` | what shows when there are no incidents |
| `incident-list` | the list |
| `incident-row` | one incident row, with `data-id="<incident id>"` |
| `ack` | the Ack button in a row |
| `acked` | the acked mark in a row |
| `build-sha` | the sha in the footer |
| `new-bar` | the "N new" bar that brings held incidents in on click |

## Done

Every issue in `issues/` delivered, deployed to a public https address, and shown working.
