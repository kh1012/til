# -*- coding: utf-8 -*-
import time, re, sys
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
import pandas as pd
from urllib import robotparser
from collections import Counter

# ======================
# 설정
# ======================
BASE = "https://www.eng-tips.com"
BOARD_URL = "https://www.eng-tips.com/forums/structural-engineering-general-discussion.507/"  # 구조 일반
PAGES = 100  # 테스트용: 최근 2페이지만

USER_AGENT = "Mozilla/5.0 (compatible; midas-research-bot/0.1; +https://midasit.com)"
TIMEOUT = 20
SLEEP_BETWEEN = 1.0
TOP_N = 15  # 키워드/바이그램 Top N

# ======================
# robots.txt 확인 (가능하면 준수)
# ======================
rp = robotparser.RobotFileParser()
rp.set_url(urljoin(BASE, "/robots.txt"))
try:
    rp.read()
    if not rp.can_fetch(USER_AGENT, BOARD_URL):
        raise SystemExit("robots.txt에서 이 경로 크롤링이 불가로 표시되어 중단합니다.")
except Exception as e:
    print("robots.txt를 확인하지 못했습니다(네트워크/접근 이슈 가능). 신중히 진행합니다:", e, file=sys.stderr)

# ======================
# 유틸
# ======================
def polite_get(url: str, headers=None, timeout=TIMEOUT, max_retry=2):
    """간단한 재시도/예의있는 GET"""
    headers = headers or {}
    for i in range(max_retry + 1):
        try:
            res = requests.get(url, headers=headers, timeout=timeout)
            res.raise_for_status()
            return res
        except Exception as e:
            if i == max_retry:
                raise
            time.sleep(1.5 * (i + 1))

def parse_count(t: str):
    """예: '88K' → 88000, '1,234' → 1234"""
    if t is None:
        return None
    s = t.strip().replace(",", "").upper()
    if not s:
        return None
    if s.endswith("K"):
        try:
            return int(float(s[:-1]) * 1000)
        except:
            return None
    return int(re.sub(r"[^\d]", "", s)) if re.search(r"\d", s) else None

# ======================
# 목록 페이지 파싱 (제목만 정확히 선택)
# ======================
def parse_forum_page(html: str, base=BASE):
    """
    XenForo 기반 포럼의 스레드 카드에서 '제목 a'만 수집.
    - 과거 로직: a[href^='/threads/'] 전수 → '시간 링크'가 섞이는 문제
    - 개선: 카드(div.structItem--thread) 내 'h3.structItem-title a[href^="/threads/"]'만
    """
    soup = BeautifulSoup(html, "html.parser")
    rows = []

    for item in soup.select("div.structItem--thread"):
        # 제목 앵커
        title_a = item.select_one("h3.structItem-title a[href^='/threads/']")
        if not title_a:
            title_a = item.select_one("div.structItem-title a[href^='/threads/']")  # 스킨 차이 폴백
        if not title_a:
            continue

        title = title_a.get_text(strip=True)
        url = urljoin(base, title_a.get("href") or "")
        if not title or not url:
            continue

        # time 태그의 datetime 우선
        time_tag = item.find("time")
        started_raw = time_tag["datetime"] if time_tag and time_tag.has_attr("datetime") else None

        # Replies / Views 추정
        block_text = item.get_text(" ", strip=True)
        m_r = re.search(r"Replies\s+([\d,]+K?)", block_text, re.I)
        m_v = re.search(r"Views\s+([\d,]+K?)", block_text, re.I)

        rows.append({
            "title": title,
            "thread_url": url,
            "started_raw": started_raw,
            "replies": parse_count(m_r.group(1)) if m_r else None,
            "views": parse_count(m_v.group(1)) if m_v else None,
        })

    # 중복 제거 (thread_url 기준)
    uniq = {}
    for r in rows:
        uniq[r["thread_url"]] = r
    return list(uniq.values())

# ======================
# 보드 수집
# ======================
def fetch_board(board_url=BOARD_URL, pages=PAGES):
    headers = {"User-Agent": USER_AGENT}
    all_rows = []
    for p in range(1, pages + 1):
        url = board_url.rstrip("/")
        if p > 1:
            url = f"{url}/page-{p}"
        print("GET", url)
        res = polite_get(url, headers=headers, timeout=TIMEOUT)
        all_rows.extend(parse_forum_page(res.text))
        time.sleep(SLEEP_BETWEEN)
    return all_rows

# ======================
# 실행
# ======================
if __name__ == "__main__":
    rows = fetch_board()
    df = pd.DataFrame(rows)
    print("샘플:", df.head(3), sep="\n")

    # ------------------
    # 날짜 정규화 → 일/주 집계
    # ------------------
    df["started_dt"] = pd.to_datetime(df["started_raw"], errors="coerce", utc=True)
    df = df.dropna(subset=["started_dt"]).copy()
    # 날짜(UTC 기준). 필요시 tz_convert로 지역화 가능.
    df["date"] = df["started_dt"].dt.date

    daily = df.groupby("date").size().rename("questions_per_day").reset_index()
    weekly = (
        df.set_index("started_dt")
          .resample("W")  # 주간(일요일 기준 종료)
          .size()
          .rename("questions_per_week")
          .reset_index()
    )

    print("\n일별 건수(상위 10일):")
    print(daily.sort_values("date", ascending=False).head(10))

    print("\n주별 건수(상위 8주):")
    print(weekly.sort_values("started_dt", ascending=False).head(8))

    # ------------------
    # 제목 기반 키워드/바이그램 (시간/요일/불용어 제거)
    # ------------------
    EN_STOP = {
        # 일반 불용어(간단 세트) — 필요시 확장
        "the","a","an","and","or","but","with","for","from","into","onto","over","under","to","in","on","of","by",
        "as","at","is","are","be","being","been","it","its","this","that","these","those","i","we","you","they","he","she",
        "any","some","more","most","such","also","about","not","no","yes","if","than","then","there","here","via","etc",
        # 포럼 맥락상의 군더더기
        "question","help","issue","problem","discussion","thread","post","posts","reply","replies","view","views",
        # 단위/표기(원하시면 유지)
        "mm","cm","m","ft","in","kn","n","lb","psi","mpa","ksf","kpa"
    }
    TIME_WORDS = {
        "today","yesterday","tomorrow",
        "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
        "am","pm"
    }
    CLEAN_WORDS = EN_STOP | TIME_WORDS

    # 토큰화
    token_series = (
        df["title"]
          .fillna("")
          .str.lower()
          .str.replace(r"[^a-z0-9\s\-/&]", " ", regex=True)
          .str.split()
    )

    def keep_token(w: str) -> bool:
        if len(w) < 3:      # 너무 짧은 토큰 제거
            return False
        if w.isdigit():     # 숫자만
            return False
        if w in CLEAN_WORDS:
            return False
        return True

    # 유니그램
    unigram_counter = Counter(
        w for words in token_series for w in (words or []) if keep_token(w)
    )
    top_unigrams = pd.Series(dict(unigram_counter.most_common(TOP_N)))

    # 바이그램
    bigram_counter = Counter()
    for words in token_series:
        words = [w for w in (words or []) if keep_token(w)]
        for i in range(len(words) - 1):
            bigram_counter[(words[i], words[i+1])] += 1
    top_bigrams = pd.Series({" ".join(k): v for k, v in bigram_counter.most_common(TOP_N)})

    print(f"\n제목 키워드 Top {TOP_N}:")
    print(top_unigrams)

    print(f"\n제목 바이그램 Top {TOP_N}:")
    print(top_bigrams)

    # ------------------
    # (옵션) CSV로 저장하고 싶다면 주석 해제
    # ------------------
    # df.to_csv("engtips_struct_threads.csv", index=False, encoding="utf-8")
    # daily.to_csv("engtips_daily_counts.csv", index=False, encoding="utf-8")
    # weekly.to_csv("engtips_weekly_counts.csv", index=False, encoding="utf-8")
    # top_unigrams.to_csv("engtips_title_unigrams.csv", header=["count"], encoding="utf-8")
    # top_bigrams.to_csv("engtips_title_bigrams.csv", header=["count"], encoding="utf-8")
