import uvicorn

if __name__ == "__main__":
    # Windows 下 reload 易残留多个监听进程，导致浏览器仍打到旧代码
    uvicorn.run("app.main:app", host="0.0.0.0", port=8010, reload=False)
