package logger

import (
	"context"
	"log/slog"
	"os"

	axiom "github.com/axiomhq/axiom-go/adapters/slog"
)

// multiHandler implements slog.Handler and fans out to multiple handlers.
type multiHandler struct {
	handlers []slog.Handler
}

func (m *multiHandler) Enabled(ctx context.Context, level slog.Level) bool {
	for _, h := range m.handlers {
		if h.Enabled(ctx, level) {
			return true
		}
	}
	return false
}

func (m *multiHandler) Handle(ctx context.Context, r slog.Record) error {
	for _, h := range m.handlers {
		if h.Enabled(ctx, r.Level) {
			_ = h.Handle(ctx, r)
		}
	}
	return nil
}

func (m *multiHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	var handlers []slog.Handler
	for _, h := range m.handlers {
		handlers = append(handlers, h.WithAttrs(attrs))
	}
	return &multiHandler{handlers: handlers}
}

func (m *multiHandler) WithGroup(name string) slog.Handler {
	var handlers []slog.Handler
	for _, h := range m.handlers {
		handlers = append(handlers, h.WithGroup(name))
	}
	return &multiHandler{handlers: handlers}
}

// Setup initializes the standard JSON logger and optionally adds the Axiom handler
// if the AXIOM_TOKEN and AXIOM_DATASET environment variables are provided.
func Setup() (*slog.Logger, func()) {
	// Initialize standard JSON Logger
	stdHandler := slog.NewJSONHandler(os.Stdout, nil)
	var finalHandler slog.Handler = stdHandler
	
	cleanup := func() {}

	// If Axiom is configured, send logs to Axiom as well
	if os.Getenv("AXIOM_TOKEN") != "" && os.Getenv("AXIOM_DATASET") != "" {
		if axiomHandler, err := axiom.New(); err == nil {
			cleanup = func() {
				axiomHandler.Close()
			}
			finalHandler = &multiHandler{handlers: []slog.Handler{stdHandler, axiomHandler}}
		} else {
			slog.Error("Failed to initialize Axiom logger", "error", err)
		}
	}

	logger := slog.New(finalHandler)
	slog.SetDefault(logger)
	
	return logger, cleanup
}
