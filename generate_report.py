
#!/usr/bin/env python3
"""Generate week-wise Form-3 reports from real Git history."""

import datetime as dt
import html
import io
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
    Image, KeepTogether, Paragraph, SimpleDocTemplate,
    Spacer, Table, TableStyle,
)

COLLEGE_NAME = (
    "Swami Keshvanand Institute of Technology, "
    "Management & Gramothan, Jaipur"
)
DEPARTMENT_NAME = "Department of Computer Science & Engineering"

OUTPUT_DIR = Path("weekly_reports")

WEEKLY_PERIODS = [
    ("Week_6", "2026-10-09", "2026-10-15"),
    ("Week_7", "2026-10-16", "2026-10-22"),
    ("Week_8", "2026-10-23", "2026-10-29"),
    ("Week_9", "2026-10-30", "2026-11-05"),
    ("Week_10", "2026-11-06", "2026-11-12"),
    ("Week_11", "2026-11-13", "2026-11-19"),
]


def git_output(args):
    return subprocess.check_output(
        args, text=True, stderr=subprocess.STDOUT
    ).strip()


def get_repo_info():
    try:
        root = git_output(["git", "rev-parse", "--show-toplevel"])
        repo_name = Path(root).name
        branch = git_output(["git", "branch", "--show-current"])
        return repo_name, branch or "detached-HEAD"
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        raise RuntimeError(
            "Run this script inside your Git repository."
        ) from exc


def get_git_metrics(start_date, end_date):
    start = dt.date.fromisoformat(start_date)
    end = dt.date.fromisoformat(end_date)

    if end < start:
        raise ValueError("End date cannot be before start date.")

    # Git's --before is exclusive, so add one day to include end_date.
    exclusive_end = end + dt.timedelta(days=1)

    command = [
        "git", "log", "--all", "--no-merges",
        "--pretty=format:COMMIT|||%h|||%an|||%ad|||%s",
        "--date=short", "--numstat",
        f"--since={start.isoformat()} 00:00:00",
        f"--before={exclusive_end.isoformat()} 00:00:00",
    ]

    try:
        raw = git_output(command)
    except subprocess.CalledProcessError as exc:
        raise RuntimeError("Could not read Git commit history.") from exc

    students = defaultdict(
        lambda: {
            "commits": 0,
            "added": 0,
            "deleted": 0,
            "active_days": set(),
        }
    )
    timeline = defaultdict(lambda: defaultdict(int))
    logs = defaultdict(list)
    current_author = None

    for line in raw.splitlines():
        if line.startswith("COMMIT|||"):
            parts = line.split("|||", 4)

            if len(parts) != 5:
                current_author = None
                continue

            _, sha, author, date_str, message = parts

            if (
                "bot" in author.lower()
                or "github-actions" in author.lower()
            ):
                current_author = None
                continue

            current_author = author.strip()
            date_str = date_str.strip()

            students[current_author]["commits"] += 1
            students[current_author]["active_days"].add(date_str)

            logs[current_author].append(
                (date_str, sha.strip(), message.strip())
            )

            timeline[date_str][current_author] += 1

        elif current_author:
            fields = line.split("\t")

            if len(fields) >= 3:
                added = (
                    int(fields[0]) if fields[0].isdigit() else 0
                )
                deleted = (
                    int(fields[1]) if fields[1].isdigit() else 0
                )

                students[current_author]["added"] += added
                students[current_author]["deleted"] += deleted

    return students, timeline, logs, start, end


def make_chart(students, timeline):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 3.5))

    authors = list(students)
    dates = sorted(timeline)

    if dates and authors:
        for author in authors:
            values = [
                timeline[date].get(author, 0)
                for date in dates
            ]
            ax1.plot(
                dates, values,
                marker="o", linewidth=1.7, label=author
            )

        ax1.set_title("Daily Commit Timeline")
        ax1.set_ylabel("Commits")
        ax1.tick_params(axis="x", rotation=45, labelsize=7)
        ax1.grid(True, linestyle="--", alpha=0.4)
        ax1.legend(fontsize=7)
    else:
        ax1.text(
            0.5, 0.5, "No commits in this period",
            ha="center", va="center"
        )
        ax1.set_axis_off()

    if authors:
        net = [
            students[a]["added"] - students[a]["deleted"]
            for a in authors
        ]
        ax2.bar(authors, net)
        ax2.set_title("Net Lines of Code")
        ax2.set_ylabel("Added - Deleted")
        ax2.tick_params(axis="x", rotation=30, labelsize=7)
        ax2.grid(axis="y", linestyle="--", alpha=0.4)
    else:
        ax2.text(
            0.5, 0.5, "No LOC changes recorded",
            ha="center", va="center"
        )
        ax2.set_axis_off()

    fig.tight_layout()

    buffer = io.BytesIO()
    fig.savefig(
        buffer, format="png", dpi=180, bbox_inches="tight"
    )
    plt.close(fig)
    buffer.seek(0)

    return Image(buffer, width=500, height=165)


def generate_pdf(week_name, start_date, end_date):
    repo_name, branch_name = get_repo_info()

    students, timeline, logs, start, end = get_git_metrics(
        start_date, end_date
    )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    filename = (
        f"{repo_name}_{week_name}_Form-3_"
        f"{start_date}_to_{end_date}.pdf"
    )
    output_path = OUTPUT_DIR / filename

    styles = getSampleStyleSheet()

    college_style = ParagraphStyle(
        "College",
        parent=styles["Heading1"],
        fontSize=13,
        leading=16,
        alignment=1,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=2,
    )

    dept_style = ParagraphStyle(
        "Dept",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        alignment=1,
        textColor=colors.HexColor("#475569"),
        spaceAfter=7,
    )

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading2"],
        fontSize=12,
        leading=15,
        alignment=1,
        textColor=colors.HexColor("#1A365D"),
        spaceAfter=8,
    )

    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontSize=10.5,
        leading=13,
        spaceBefore=7,
        spaceAfter=4,
    )

    small_style = ParagraphStyle(
        "Small",
        parent=styles["Normal"],
        fontSize=7.5,
        leading=9,
    )

    centered_style = ParagraphStyle(
        "Centered",
        parent=small_style,
        alignment=1,
    )

    total_commits = sum(
        item["commits"] for item in students.values()
    )

    story = [
        Paragraph(
            f"<b>{html.escape(COLLEGE_NAME)}</b>",
            college_style,
        ),
        Paragraph(
            f"<b>{html.escape(DEPARTMENT_NAME)}</b>",
            dept_style,
        ),
        Paragraph(
            f"<u><b>{week_name.replace('_', ' ')} "
            "Progress Report (Form-3)</b></u>",
            title_style,
        ),
        Paragraph(
            f"<b>Project Repository:</b> {html.escape(repo_name)}"
            f" &nbsp; | &nbsp; <b>Branch:</b> "
            f"{html.escape(branch_name)}",
            styles["Normal"],
        ),
        Paragraph(
            f"<b>Evaluation Window:</b> {start} to {end}"
            f" &nbsp; | &nbsp; <b>Generated On:</b> "
            f"{dt.date.today().strftime('%B %d, %Y')}",
            small_style,
        ),
        Spacer(1, 5),
        Paragraph(
            "1. Individual Contribution Breakdown",
            section_style,
        ),
    ]

    data = [[
        "Student Name", "Commits (%)", "Lines Added",
        "Lines Deleted", "Net LOC", "Active Days",
    ]]

    for name, item in students.items():
        pct = (
            item["commits"] / total_commits * 100
            if total_commits else 0
        )

        data.append([
            Paragraph(html.escape(name), small_style),
            f"{item['commits']} ({pct:.1f}%)",
            f"+{item['added']:,}",
            f"-{item['deleted']:,}",
            f"{item['added'] - item['deleted']:,}",
            f"{len(item['active_days'])} days",
        ])

    if not students:
        data.append([
            "No commits found in this period",
            "-", "-", "-", "-", "-",
        ])

    table = Table(
        data,
        colWidths=[120, 75, 75, 75, 70, 70],
        repeatRows=1,
    )

    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0),
         colors.HexColor("#1E293B")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1),
         0.4, colors.HexColor("#CBD5E1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1),
         [colors.white, colors.HexColor("#F8FAFC")]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))

    story.extend([
        table,
        Spacer(1, 5),
        Paragraph("2. Visual Trends &amp; Volume", section_style),
        make_chart(students, timeline),
        Paragraph(
            "3. Detailed Commit Logs &amp; Mentor Evaluation",
            section_style,
        ),
    ])

    if not logs:
        story.append(
            Paragraph(
                "No commit logs found for this timeframe.",
                styles["Normal"],
            )
        )

    for author, entries in logs.items():
        group = [
            Paragraph(
                f"<b>Student:</b> {html.escape(author)} "
                f"— <i>{len(entries)} commit(s)</i>",
                styles["Heading3"],
            )
        ]

        log_data = [[
            "Date", "Hash", "Commit Message", "Mentor Marks (/10)"
        ]]

        for index, (date_str, sha, message) in enumerate(entries):
            log_data.append([
                Paragraph(html.escape(date_str), centered_style),
                Paragraph(html.escape(sha), centered_style),
                Paragraph(
                    html.escape(message or "(No commit message)"),
                    small_style,
                ),
                Paragraph(
                    "_____ / 10" if index == 0 else "",
                    centered_style,
                ),
            ])

        log_table = Table(
            log_data,
            colWidths=[65, 50, 330, 85],
            repeatRows=1,
        )

        table_style = [
            ("BACKGROUND", (0, 0), (-1, 0),
             colors.HexColor("#475569")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("GRID", (0, 0), (-1, -1),
             0.4, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BACKGROUND", (3, 1), (3, -1),
             colors.HexColor("#FEF3C7")),
        ]

        if len(log_data) > 2:
            table_style.append(
                ("SPAN", (3, 1), (3, len(log_data) - 1))
            )

        log_table.setStyle(TableStyle(table_style))

        group.extend([log_table, Spacer(1, 6)])
        story.append(KeepTogether(group))

    story.append(Spacer(1, 14))

    signatures = Table(
        [[
            Paragraph(
                "<b>Name:</b> _________________________"
                "<br/><b>Designation:</b> Project Mentor"
                "<br/><br/><b>Signature:</b> _____________________",
                styles["Normal"],
            ),
            Paragraph(
                "<b>Name:</b> _________________________"
                "<br/><b>Designation:</b> Lab Coordinator"
                "<br/><br/><b>Signature:</b> _____________________",
                styles["Normal"],
            ),
        ]],
        colWidths=[270, 270],
    )

    signatures.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))

    story.append(signatures)

    document = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        rightMargin=30,
        leftMargin=30,
        topMargin=28,
        bottomMargin=28,
    )

    document.build(story)

    print(
        f"\n[SUCCESS] {output_path}\n"
        f"Authors: {len(students)} | Commits: {total_commits}"
    )


def generate_all_weeks():
    for week_name, start, end in WEEKLY_PERIODS:
        print(f"\nGenerating {week_name}: {start} to {end}")
        generate_pdf(week_name, start, end)


if __name__ == "__main__":
    try:
        if len(sys.argv) == 1 or sys.argv[1] == "all-weeks":
            generate_all_weeks()

        elif len(sys.argv) == 4:
            generate_pdf(
                sys.argv[1],
                sys.argv[2],
                sys.argv[3],
            )

        else:
            print(
                "Usage:\n"
                "  python3 generate_report.py all-weeks\n"
                "  python3 generate_report.py Week_6 "
                "2026-10-09 2026-10-15"
            )
            sys.exit(1)

    except (ValueError, RuntimeError) as error:
        print(f"\n[ERROR] {error}", file=sys.stderr)
        sys.exit(1)
