package main

import (
	"io"
	"log"
	"os"
	"path/filepath"
)

// seedUploads copies the cafe's own photos and menu PDF from seed-uploads/
// (shipped in the image) into uploads/ (the Railway volume).
//
// The settings and offers reference these files by name — /uploads/menu-1-hot-coffee.jpg
// and so on — but uploads/ is gitignored, so a fresh deployment had none of them
// and every photo 404'd. Re-uploading through the panel can't fix that: it
// prefixes a timestamp to each name and refuses PDFs. A file already in
// uploads/ is never overwritten, so anything changed from the panel survives.
func seedUploads() {
	const src, dst = "seed-uploads", "uploads"

	entries, err := os.ReadDir(src)
	if err != nil {
		if !os.IsNotExist(err) {
			log.Printf("Could not read %s: %v", src, err)
		}
		return
	}
	if err := os.MkdirAll(dst, 0755); err != nil {
		log.Printf("Could not create %s: %v", dst, err)
		return
	}

	copied := 0
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		to := filepath.Join(dst, e.Name())
		if _, err := os.Stat(to); err == nil {
			continue
		}
		if err := copyFile(filepath.Join(src, e.Name()), to); err != nil {
			log.Printf("Could not seed %s: %v", e.Name(), err)
			continue
		}
		copied++
	}
	if copied > 0 {
		log.Printf("Seeded %d cafe images into %s/", copied, dst)
	}
}

func copyFile(from, to string) error {
	in, err := os.Open(from)
	if err != nil {
		return err
	}
	defer in.Close()

	// Write to a temporary name first so a crash mid-copy never leaves a
	// truncated file that the next boot would treat as already seeded.
	tmp := to + ".partial"
	out, err := os.Create(tmp)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		os.Remove(tmp)
		return err
	}
	if err := out.Close(); err != nil {
		os.Remove(tmp)
		return err
	}
	return os.Rename(tmp, to)
}
