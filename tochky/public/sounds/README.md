# Dots Game Sounds

This directory contains the audio assets used in the game. 
Currently, they are MVP placeholder `.wav` files generated with basic sine waves. 

## Sound Files & Their Roles

| Filename | Role / Trigger Event | Suggested Vibe for Replacement |
| :--- | :--- | :--- |
| `bgm.wav` | Background music (loops while in a game room). | Calm, non-distracting ambient lo-fi synth loop. |
| `move_self.wav` | Played when the local player makes a move. | Short, satisfying 'pop' or woodblock tap. |
| `move_opponent.wav` | Played when the opponent makes a move. | Slightly lower pitched 'pop' or tap. |
| `capture.wav` | Played when a territory (dots) is captured. | Pleasant chime, bell, or satisfying "ding". |
| `win.wav` | Played when the game ends and the local player wins. | Uplifting short fanfare or bright ascending chords. |
| `lose.wav` | Played when the game ends and the local player loses. | Descending minor chords or soft melancholy tone. |
| `draw.wav` | Played when the game ends in a tie. | Neutral double-tone. |
| `undo_req.wav` | Played when the opponent requests an undo. | Gentle alert beep or rising tone. |
| `undo_acc.wav` | Played when an undo request is accepted. | Soft rewind or 'whoosh' sound. |
| `timer_tick.wav` | Played when the timer is low (e.g., < 10 seconds). | Quiet tick or high-hat. |

## How to Replace Sounds

To upgrade the sound quality:
1. Find high-quality, royalty-free sounds (e.g., from [Freesound.org](https://freesound.org/) under the CC0 license).
2. Save them in `.wav`, `.mp3`, or `.ogg` format.
3. Replace the corresponding file in this directory (`tochky/public/sounds/`).
4. If you change the file extension (e.g., from `.wav` to `.mp3`), make sure to update the file paths in `tochky/components/sound-provider.tsx` where the sounds are loaded.
