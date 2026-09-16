#!/usr/bin/env python3
"""Send synthetic log events to a Logis live session.

Registers a session key to obtain a token, then POSTs a batch of log
events to /log. Every event carries the same small set of top-level
keys (date, level, message, context, actor, resource, and sometimes
notes) - deliberately few, so the dashboard's column list stays short,
but each one is picked to stress a specific rendering case:

  - notes:    present only some of the time (an empty/missing column)
  - context:  always present, nested exactly 5 levels deep
  - actor:    the same column, sent in different shapes across events
              (an {id, name} object, an {id, role} object, or a plain
              string)
  - resource: a different column that sometimes reuses actor's
              {id, name} shape, and sometimes has its own {type, sku}
              shape

Usage:
    python3 scripts/send_logs.py 50
    python3 scripts/send_logs.py 200 --base-url http://localhost:4000 --key demo --delay 0.1
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone


def post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        raise SystemExit(f"POST {url} failed: {e.code} {detail}") from e
    except urllib.error.URLError as e:
        raise SystemExit(f"POST {url} failed: {e.reason}") from e


def register(base_url: str, key: str) -> str:
    body = post_json(f"{base_url}/register", {"key": key})
    token = body.get("token")
    if not token:
        raise SystemExit(f"Registration did not return a token: {body}")
    return token


def send_log(base_url: str, token: str, entry: dict) -> dict:
    return post_json(f"{base_url}/log?token={token}", entry)


def rid(prefix: str, n: int = 8) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:n]}"


MESSAGES = ["UserLogin", "OrderPlaced", "PaymentFailed", "HealthCheck", "TaskCompleted"]
LEVELS = ["debug", "info", "warn", "error"]


def gen_notes() -> str | None:
    """Present on some events, absent on others - an empty/missing column."""
    if random.random() < 0.4:
        return random.choice([
            "requires manual review",
            "retried automatically",
            "flagged as suspicious",
            "customer requested callback",
        ])
    return None


def gen_context() -> dict:
    """Always present, nested exactly 5 levels deep: context.trace.span.parent.origin.*"""
    return {
        "trace": {
            "span": {
                "parent": {
                    "origin": {
                        "service": random.choice(["api", "worker", "gateway"]),
                        "region": random.choice(["eu-west-1", "us-east-1", "il-central-1"]),
                    }
                }
            }
        }
    }


def gen_actor() -> dict | str:
    """The same column, sent in a different shape (or as a plain string) each time."""
    r = random.random()
    if r < 0.4:
        return {"id": f"u-{random.randint(1000, 1099)}", "name": random.choice(
            ["Dana Cohen", "Alex Lee", "Sam Rivera", "Noa Levi"]
        )}
    if r < 0.7:
        return {"id": f"svc-{random.choice(['worker', 'scheduler', 'gateway'])}-{random.randint(1, 5)}", "role": "service"}
    return random.choice(["system", "anonymous"])


def gen_resource() -> dict:
    """A different column that sometimes mirrors actor's {id, name} shape."""
    if random.random() < 0.5:
        return {"id": rid("res"), "name": random.choice(["Invoice", "Ticket", "Document", "Report"])}
    return {"type": random.choice(["order", "subscription", "ticket"]), "sku": f"sku-{random.randint(1, 999)}"}


def build_entry() -> dict:
    entry = {
        "date": datetime.now(timezone.utc).isoformat(),
        "level": random.choice(LEVELS),
        "message": random.choice(MESSAGES),
        "context": gen_context(),
        "actor": gen_actor(),
        "resource": gen_resource(),
    }
    notes = gen_notes()
    if notes is not None:
        entry["notes"] = notes
    return entry


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("count", type=int, help="number of log events (commands) to send")
    parser.add_argument("--base-url", default="http://localhost:4000", help="Logis ingest server base URL (default: %(default)s)")
    parser.add_argument("--key", default="cli-script", help="session key to register (default: %(default)s)")
    parser.add_argument("--token", default=None, help="reuse an existing token instead of registering")
    parser.add_argument("--delay", type=float, default=0.2, help="seconds to sleep between sends (default: %(default)s)")
    parser.add_argument("--quiet", action="store_true", help="only print a summary at the end")
    args = parser.parse_args()

    if args.count <= 0:
        raise SystemExit("count must be a positive integer")

    token = args.token or register(args.base_url, args.key)
    if not args.quiet:
        print(f"Using token: {token}")

    delivered = 0
    for i in range(1, args.count + 1):
        entry = build_entry()
        result = send_log(args.base_url, token, entry)
        if result.get("delivered"):
            delivered += 1
        if not args.quiet:
            print(f"[{i}/{args.count}] {entry['message']}: {json.dumps(entry)} -> {result}")
        if args.delay and i < args.count:
            time.sleep(args.delay)

    print(f"Sent {args.count} log events, {delivered} delivered to an active listener.")


if __name__ == "__main__":
    main()
