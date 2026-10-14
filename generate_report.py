#!/usr/bin/env python3
"""Generate a Form-3 progress report from the repository's real Git history.

Usage:
  python3 generate_report.py weekly
  python3 generate_report.py monthly
  python3 generate_report.py final
"""

import datetime as dt
import html
import io
import os
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

COLLEGE_NAME = "Swami Keshvanand Institute of Technology, Management & Gramothan, Jaipur"
DEPARTMENT_NAME = "Department of Computer Science & Engineering"


def git_output(args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT).strip()


def get_repo_info():
    try:
        root = git_output(["git", "rev-parse", "--show-toplevel"])
        repo_name = Path(root).name
    except (subprocess.CalledProcessError, FileNotFoundError):
        repo_name = Path.cwd().name
    try:
        branch = git_output(["git", "branch", "--show-current"]) or "detached-HEAD"
    except (subprocess.CalledProcessError, FileNotFoundError):
        branch = "unknown"
    return repo_name, branch


def get_git_metrics(interval):
    today = dt.date.today()
    if interval == "weekly":
        since = today - dt.timedelta(days=7)
        scope = f"Last 7 Days (Since {since.isoformat()})"
        period = "weekly"
    elif interval == "monthly":
        since = today - dt.timedelta(days=30)
        scope = f"Last 30 Days (Since {since.isoformat()})"
        period = "monthly"
    elif interval == "final":
        since = None
        scope = "Complete Project Lifecycle (All Commits)"
        period = "final"
    else:
        raise ValueError("Choose weekly, monthly, or final")

    command = [
        "git", "log", "--all", "--no-merges",
        "--pretty=format:COMMIT|||%h|||%an|||%ad|||%s", "--date=short", "--numstat",
    ]
    if since:
        command.append(f"--since={since.isoformat()} 00:00:00")
    try:
        raw = git_output(command)
    except subprocess.CalledProcessError as exc:
        raise RuntimeError("Git history could not be read. Run this script inside the cloned repository.") from exc

    students = defaultdict(lambda: {"commits": 0, "added": 0, "deleted": 0, "active_days": set()})
    timeline = defaultdict(lambda: defaultdict(int))
    logs = defaultdict(list)
    current_author = None

    for line in raw.splitlines():
        if line.startswith("COMMIT|||"):
            parts = line.split("|||", 4)
            if len(parts) < 5:
                current_author = None
                continue
            _, sha, author, date_str, message = parts
            if "bot" in author.lower() or "github-actions" in author.lower():
                current_author = None
                continue
            current_author = author.strip()
            date_str = date_str.strip()
            students[current_author]["commits"] += 1
            students[current_author]["active_days"].add(date_str)
            logs[current_author].append((date_str, sha.strip(), message.strip()))
            try:
                date_obj = dt.date.fromisoformat(date_str)
                if period == "weekly":
                    key = date_obj.strftime("%a (%b %d)")
                elif period == "monthly":
                    iso = date_obj.isocalendar()
                    key = f"{iso.year}-W{iso.week:02d}"
                else:
                    key = date_obj.strftime("%Y-%m")
                timeline[key][current_author] += 1
            except ValueError:
                pass
        elif current_author:
            fields = line.split("\t")
            if len(fields) >= 3:
                # Binary-file changes use '-' rather than numeric line counts.
                try:
                    added = int(fields[0]) if fields[0].isdigit() else 0
                    deleted = int(fields[1]) if fields[1].isdigit() else 0
                except ValueError:
                    added = deleted = 0
                students[current_author]["added"] += added
                students[current_author]["deleted"] += deleted

    return students, timeline, logs, scope


def make_chart(students, timeline, interval):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 3.5))
    authors = list(students)
    periods = sorted(timeline)
    if periods and authors:
        for author in authors:
            values = [timeline[p].get(author, 0) for p in periods]
            ax1.plot(periods, values, marker="o", linewidth=1.7, label=author)
        ax1.set_title(f"Commit Timeline ({interval.title()})")
        ax1.set_ylabel("Commits")
        ax1.tick_params(axis="x", rotation=35, labelsize=7)
        ax1.grid(True, linestyle="--", alpha=0.4)
        ax1.legend(fontsize=7)
    else:
        ax1.text(0.5, 0.5, "No commits in this period", ha="center", va="center")
        ax1.set_axis_off()

    if authors:
        net = [students[a]["added"] - students[a]["deleted"] for a in authors]
        ax2.bar(authors, net)
        ax2.set_title("Net Lines of Code")
        ax2.set_ylabel("Added − Deleted")
        ax2.tick_params(axis="x", rotation=30, labelsize=7)
        ax2.grid(axis="y", linestyle="--", alpha=0.4)
    else:
        ax2.text(0.5, 0.5, "No LOC changes recorded", ha="center", va="center")
        ax2.set_axis_off()
    fig.tight_layout()
    buffer = io.BytesIO()
    fig.savefig(buffer, format="png", dpi=180, bbox_inches="tight")
    plt.close(fig)
    buffer.seek(0)
    return Image(buffer, width=500, height=165)


def generate_pdf(interval="weekly"):
    repo_name, branch_name = get_repo_info()
    students, timeline, logs, scope = get_git_metrics(interval)
    today = dt.date.today().isoformat()
    if interval == "weekly":
        title = "Weekly Progress Report (Form-3)"
        filename = f"{repo_name}_Weekly_Progress_Report_Form-3_{today}.pdf"
    elif interval == "monthly":
        title = "Monthly Progress Report (Form-3)"
        filename = f"{repo_name}_Monthly_Progress_Report_Form-3_{today}.pdf"
    else:
        title = "Final Project Evaluation Report"
        filename = f"{repo_name}_Final_Report_{today}.pdf"

    styles = getSampleStyleSheet()
    college_style = ParagraphStyle("College", parent=styles["Heading1"], fontSize=13, leading=16, alignment=1, textColor=colors.HexColor("#0F172A"), spaceAfter=2)
    dept_style = ParagraphStyle("Dept", parent=styles["Normal"], fontSize=9, leading=12, alignment=1, textColor=colors.HexColor("#475569"), spaceAfter=7)
    title_style = ParagraphStyle("ReportTitle", parent=styles["Heading2"], fontSize=12, leading=15, alignment=1, textColor=colors.HexColor("#1A365D"), spaceAfter=8)
    section_style = ParagraphStyle("Section", parent=styles["Heading2"], fontSize=10.5, leading=13, spaceBefore=7, spaceAfter=4)
    small_style = ParagraphStyle("Small", parent=styles["Normal"], fontSize=7.5, leading=9)
    centered_style = ParagraphStyle("Centered", parent=small_style, alignment=1)

    story = [
        Paragraph(f"<b>{html.escape(COLLEGE_NAME)}</b>", college_style),
        Paragraph(f"<b>{html.escape(DEPARTMENT_NAME)}</b>", dept_style),
        Paragraph(f"<u><b>{html.escape(title)}</b></u>", title_style),
        Paragraph(f"<b>Project Repository:</b> {html.escape(repo_name)} &nbsp; | &nbsp; <b>Branch:</b> {html.escape(branch_name)}", styles["Normal"]),
        Paragraph(f"<b>Evaluation Window:</b> {html.escape(scope)} &nbsp; | &nbsp; <b>Generated On:</b> {dt.date.today().strftime('%B %d, %Y')}", small_style),
        Spacer(1, 5),
        Paragraph("1. Individual Contribution Breakdown", section_style),
    ]
    total_commits = sum(x["commits"] for x in students.values())
    data = [["Student Name", "Commits (%)", "Lines Added", "Lines Deleted", "Net LOC", "Active Days"]]
    for name, item in students.items():
        pct = item["commits"] / total_commits * 100 if total_commits else 0
        data.append([name, f"{item['commits']} ({pct:.1f}%)", f"+{item['added']:,}", f"-{item['deleted']:,}", f"{item['added'] - item['deleted']:,}", f"{len(item['active_days'])} days"])
    if not students:
        data.append(["No commits found in this period", "-", "-", "-", "-", "-"])
    table = Table(data, colWidths=[120, 75, 75, 75, 70, 70], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story += [table, Spacer(1, 5), Paragraph("2. Visual Trends &amp; Volume", section_style), make_chart(students, timeline, interval), Paragraph(f"3. Detailed Commit Logs &amp; Mentor Evaluation ({interval.title()})", section_style)]

    if not logs:
        story.append(Paragraph("No commit logs found for this timeframe.", styles["Normal"]))
    else:
        for author, entries in logs.items():
            group = [Paragraph(f"<b>Student:</b> {html.escape(author)} — <i>{len(entries)} commit(s)</i>", styles["Heading3"])]
            log_data = [["Date", "Hash", "Commit Message", "Mentor Marks (/10)"]]
            for index, (date_str, sha, message) in enumerate(entries):
                log_data.append([
                    Paragraph(html.escape(date_str), centered_style),
                    Paragraph(html.escape(sha), centered_style),
                    Paragraph(html.escape(message or "(No commit message)"), small_style),
                    Paragraph("_____ / 10" if index == 0 else "", centered_style),
                ])
            log_table = Table(log_data, colWidths=[65, 50, 330, 85], repeatRows=1)
            ts = [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#475569")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BACKGROUND", (3, 1), (3, -1), colors.HexColor("#FEF3C7")),
            ]
            if len(log_data) > 2:
                ts += [("SPAN", (3, 1), (3, len(log_data) - 1))]
            log_table.setStyle(TableStyle(ts))
            group.extend([log_table, Spacer(1, 6)])
            story.append(KeepTogether(group))

    story += [Spacer(1, 14)]
    signatures = Table([
        [Paragraph("<b>Name:</b> _________________________<br/><b>Designation:</b> Project Mentor<br/><br/><b>Signature:</b> _____________________", styles["Normal"]),
         Paragraph("<b>Name:</b> _________________________<br/><b>Designation:</b> Lab Coordinator<br/><br/><b>Signature:</b> _____________________", styles["Normal"])],
    ], colWidths=[270, 270])
    signatures.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 10)]))
    story.append(signatures)
    SimpleDocTemplate(filename, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=28, bottomMargin=28).build(story)
    print(f"\n[SUCCESS] Generated: {filename}")
    print(f"Found {len(students)} author(s) and {total_commits} commit(s).")


if __name__ == "__main__":
    interval = sys.argv[1].lower() if len(sys.argv) > 1 else "weekly"
    try:
        generate_pdf(interval)
    except (ValueError, RuntimeError) as error:
        print(f"[ERROR] {error}", file=sys.stderr)
        sys.exit(1)
