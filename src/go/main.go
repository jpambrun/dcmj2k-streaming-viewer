package main

import (
	"bytes"
	"fmt"
	"github.com/ian-kent/linkio"
	"io"
	"log"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"time"
)

var link *linkio.Link
var rate, latency int = 1024 * 1024 * 1000, 0 // 1000gbit, 0 ms

type LimitedResponseWriter struct {
	originalResponseWriter http.ResponseWriter
	w                      io.Writer
}

func (r LimitedResponseWriter) Header() http.Header {
	return r.originalResponseWriter.Header()
}

func (r LimitedResponseWriter) Write(in []byte) (int, error) {
	buf := bytes.NewBuffer(in)
	nWritten := 0
	for nWritten < len(in) {
		n, err := io.Copy(r.w, buf)
    //short write are expected with this rate limiting method
    if err != nil && err != io.ErrShortWrite {
      return nWritten, err
    }
		nWritten += int(n)
	}
	return nWritten, nil
}

func (r LimitedResponseWriter) WriteHeader(in int) {
	r.originalResponseWriter.WriteHeader(in)
}

func NewLimitedResponseWriter(w http.ResponseWriter) *LimitedResponseWriter {
	lrw := new(LimitedResponseWriter)
	lrw.w = link.NewLinkWriter(w)
	lrw.originalResponseWriter = w
	return lrw
}

func main() {
  link = linkio.NewLink(linkio.Throughput(rate))
	//http.HandleFunc("/", rateLimitedHandler)
	http.HandleFunc("/data/", rateLimitedHandler)
	http.HandleFunc("/", handler)
	log.Fatal(http.ListenAndServe("localhost:8000", nil))
}

func rateLimitedHandler(w http.ResponseWriter, r *http.Request) {
	var filePath string = ""

	if strings.EqualFold(r.URL.Path, "/") {
		filePath = "./index.html"
	} else {
		filePath = "." + r.URL.Path
	}
	var ok error
	lrw := NewLimitedResponseWriter(w)

	q := r.URL.Query()

	if (len(q["rate"])) != 0 {
		_, ok = strconv.Atoi(q["rate"][0])
		if ok == nil {
			rate, _ = strconv.Atoi(q["rate"][0])
			rate = rate * 1024 // in kBytes
			link.SetThroughput(linkio.Throughput(rate *6/5))
		}
	}

	if (len(q["latency"])) != 0 {
		_, ok = strconv.Atoi(q["latency"][0])
		if ok == nil {
			latency, _ = strconv.Atoi(q["latency"][0])
		}
	}

  if(latency != 0){
    time.Sleep(time.Duration(latency) * time.Millisecond)
  }

	file, err := os.Open(filePath)
	if err != nil {
		fmt.Printf("%s not found\n", filePath)
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprint(w, "<html><body style='font-size:100px'>four-oh-four</body></html>")
		return
	}
	defer file.Close()
	//fileStat, err := os.Stat(filePath)
	//if err != nil {
		//fmt.Println(err)
	//}
	fmt.Printf("Rate limited serve %s with rate %d kbps and latency %d ms\n", filePath, rate/1024, latency)
	_, filename := path.Split(filePath)
	//t := fileStat.ModTime()
	//fmt.Printf("time %+v\n", t)
  http.ServeContent(lrw, r, filename, time.Now(), file)
}

func handler(w http.ResponseWriter, r *http.Request) {
	var filePath string = ""

	if strings.EqualFold(r.URL.Path, "/") {
		filePath = "./index.html"
	} else {
		filePath = "." + r.URL.Path
	}

	var ok error
	q := r.URL.Query()

	if (len(q["rate"])) != 0 {
		_, ok = strconv.Atoi(q["rate"][0])
		if ok == nil {
			rate, _ = strconv.Atoi(q["rate"][0])
			rate = rate * 1024
			link.SetThroughput(linkio.Throughput(rate *6/5))
		}
	}

	if (len(q["latency"])) != 0 {
		_, ok = strconv.Atoi(q["latency"][0])
		if ok == nil {
			latency, _ = strconv.Atoi(q["latency"][0])
		}
	}
	file, err := os.Open(filePath)
	if err != nil {
		fmt.Printf("%s not found\n", filePath)
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprint(w, "<html><body style='font-size:100px'>four-oh-four</body></html>")
		return
	}
	defer file.Close()
	fileStat, err := os.Stat(filePath)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Printf("serve %s\n", filePath)
	_, filename := path.Split(filePath)
	t := fileStat.ModTime()
	fmt.Printf("time %+v\n", t)
	http.ServeContent(w, r, filename, t, file)
}
