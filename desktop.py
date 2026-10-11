"""StickPad desktop launcher.

Starts the local server, opens an app-style window and exits when the window is closed.
The database lives in the user's data directory (~/.local/share/StickPad), so it survives updates.

Options:  --no-window   only run the server (prints the URL)      --port N   use another port
"""
import json
import os
import shutil
import signal
import subprocess
import sys
import threading
import time
import urllib.request
import webbrowser

APP = "StickPad"


def data_dir():
    base = os.environ.get("XDG_DATA_HOME") or os.path.join(os.path.expanduser("~"), ".local", "share")
    path = os.path.join(base, APP)
    os.makedirs(path, exist_ok=True)
    return path


# Must be set before the Flask app module is imported.
os.environ.setdefault("STICKPAD_DB", os.path.join(data_dir(), "stickpad.db"))


def clean_env():
    """PyInstaller points LD_LIBRARY_PATH at its bundle; restore the user's value for child processes."""
    env = dict(os.environ)
    orig = env.pop("LD_LIBRARY_PATH_ORIG", None)
    if orig is not None:
        env["LD_LIBRARY_PATH"] = orig
    else:
        env.pop("LD_LIBRARY_PATH", None)
    return env


def is_running(port):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/ping", timeout=1.5) as r:
            return json.load(r).get("app") == "stickpad"
    except Exception:
        return False


def find_browser():
    for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "brave-browser",
                 "microsoft-edge", "microsoft-edge-stable", "vivaldi"):
        path = shutil.which(name)
        if path:
            return path
    return None


def open_window(url):
    """Open an app-style window. Returns the process to wait on, or None if only a normal tab was opened."""
    browser = find_browser()
    if browser:
        profile = os.path.join(data_dir(), "window-profile")
        cmd = [browser, f"--app={url}", f"--user-data-dir={profile}", "--no-first-run",
               "--no-default-browser-check", "--window-size=1320,880", "--class=StickPad"]
        try:
            return subprocess.Popen(cmd, env=clean_env(), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except OSError:
            pass
    # No Chromium-based browser: use the default browser (the page tells the server when it is closed).
    try:
        subprocess.Popen(["xdg-open", url], env=clean_env(), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except OSError:
        webbrowser.open(url)
    return None


def main(argv):
    port = int(os.environ.get("STICKPAD_PORT", 47474))
    no_window = "--no-window" in argv or os.environ.get("STICKPAD_NO_WINDOW") == "1"
    if "--port" in argv:
        port = int(argv[argv.index("--port") + 1])
    url = f"http://127.0.0.1:{port}/"

    if is_running(port):  # single instance: just open another window on the running server
        if not no_window:
            open_window(url)
        return 0

    import app as stickpad  # imported late so STICKPAD_DB is already set
    from werkzeug.serving import make_server

    try:
        server = make_server("127.0.0.1", port, stickpad.app, threaded=True)
    except OSError:  # port taken by something else
        server = make_server("127.0.0.1", 0, stickpad.app, threaded=True)
        url = f"http://127.0.0.1:{server.server_port}/"
    threading.Thread(target=server.serve_forever, daemon=True).start()
    print(f"{APP} {stickpad.VERSION} running at {url}  (data: {os.environ['STICKPAD_DB']})", file=sys.stderr, flush=True)

    stop = threading.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: stop.set())

    def watchdog():  # the page pings every 15 s and says goodbye when closed
        started = time.time()
        while not stop.is_set():
            time.sleep(1)
            p, now = stickpad.PRESENCE, time.time()
            if p["bye"] and now - p["bye"] > 6:
                break
            if not no_window and now - (p["last_ping"] or started) > 300:
                break
        stop.set()

    threading.Thread(target=watchdog, daemon=True).start()

    if not no_window:
        proc = open_window(url)
        if proc is not None:
            def wait_window():
                t0 = time.time()
                proc.wait()
                if time.time() - t0 > 3:  # a real window was closed (not a hand-over to an existing browser)
                    stop.set()
            threading.Thread(target=wait_window, daemon=True).start()
    stop.wait()
    server.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
