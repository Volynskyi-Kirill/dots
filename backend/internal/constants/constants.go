package constants

const (
	Player1 = 1
	Player2 = 2
	Empty   = 0
)

const (
	MessageChat           = "chat"
	MessageMove           = "move"
	MessageState          = "state"
	MessageJoin           = "join"
	MessageError          = "error"
	MessageDisconnect     = "disconnect"
	MessageWelcome        = "welcome"
	MessageUndoRequest    = "request_undo"
	MessageUndoAnswer     = "answer_undo"
	MessageSurrender      = "surrender"
	MessagePass           = "pass"
	MessageRematchRequest = "request_rematch"
	MessageRematchAnswer  = "answer_rematch"
	MessageTimeout        = "timeout"
)

type GameStatus string

const (
	StatusWaiting  GameStatus = "waiting"
	StatusPlaying  GameStatus = "playing"
	StatusFinished GameStatus = "finished"
)

type WinReason string

const (
	ReasonSurrender         WinReason = "surrender"
	ReasonTimeout           WinReason = "timeout"
	ReasonDisconnect        WinReason = "disconnect"
	ReasonBoardFull         WinReason = "board_full"
	ReasonConsecutivePasses WinReason = "consecutive_passes"
	ReasonTargetScore       WinReason = "target_score"
)

type WinCondition string

const (
	WinConditionFullBoard   WinCondition = "full_board"
	WinConditionTargetScore WinCondition = "target_score"
)

const (
	DefaultTargetScore       = 20
	DefaultRoomEmptyTimeout  = 3  // minutes
	DefaultDisconnectTimeout = 15 // seconds
)
