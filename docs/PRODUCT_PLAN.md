# Product contract

Daybreak helps the user stay awake after quieting an alarm. It is configurable,
device-local, and intentionally not an unbypassable alarm lockout.

## Primary loop

1. Gentle sound begins. The browser requires an active page and permission to play.
2. Quiet stops sound immediately; it does not reset a running mission deadline.
3. The game (when enabled) requires successful rounds over a minimum engagement
   duration. Difficulty and duration are independently adjustable.
4. QR (when enabled) requires scanning the locally generated random token. It can
   be used alone or after the game to move the user out of bed.
5. Check-in (when enabled) appears after a configurable interval; optionally it
   requires returning to the QR location. Ignoring it is not recorded as success.
6. Follow-up sound catches an unfinished/missed response window. Delay and repeat
   count are adjustable. Disabled follow-ups means no hidden repeat sound.
7. Optional ordinary snooze is limited by settings chosen before the session.
8. Intentional skip cancels the current routine and records a skip.

## Independent controls

Sound preset; sound level; ramp on/off and length; game on/off, type, difficulty,
engagement time; quiet-window length; QR on/off and location; follow-ups on/off,
delay, and repeat limit; check-in on/off, delay, and QR requirement; snooze on/off,
duration, and limit; feedback on/off; optional sleep context on/off; saved presets.

Settings and presets apply to future alarms. Armed/active sessions keep snapshots.
Turning off game, QR, and check-in produces a normal alarm dismissed by Quiet.

## Three hypotheses

| Idea | Mechanism | What to compare |
| --- | --- | --- |
| Short changing game | Sustained attention interrupts automatic snoozing | Completion time, missed windows, stayed-up self-report |
| Out-of-bed QR | Changes physical location | Stayed-up self-report vs game-only mornings |
| Delayed check-in | Detects missed follow-through after a completed mission | Missed check-ins, repeat sound, stayed-up self-report |

None of these hypotheses is presented as a clinically proven intervention.

## Tracking

Full event timeline and settings snapshot; scheduled time; observed browser
ring/quiet/missions; native Stop/Open interactions (not invented system ring
timestamps); retries, snoozes, repeat ordinals, completion, skip, expiry; optional
stayed-up report, alertness, pleasantness, bedtime, and interruptions.

Compare real mornings by treatment settings, with sample counts and missing
reports visible. Exclude practice. Distinguish engagement completion from actual
staying awake. Planned time in bed is not a measured sleep duration. Exports and
delete are available; there is no tracking backend or automatic cloud sync.

## Current boundaries

The web app is a companion and active-page alarm experience. The native source
requires macOS compilation and real-device tests. Scheduling is explicitly for
the next selected morning; indefinite recurrence, HealthKit integration, cloud
sync, smart-home lighting, and App Store distribution are future work.

More games can use the existing mission transition (`game` → `qr` → check-in)
without changing the alarm lifecycle. New treatment settings must join routine
grouping so comparisons do not mix different configurations.
