//+------------------------------------------------------------------+
//| NewsFilter.mqh - high-impact USD events (NFP, CPI, PCE, FOMC...) |
//| Source 1 (live): MetaQuotes economic calendar built into MT5.    |
//| Source 2 (tester / fallback): Common\Files\XQAI\calendar.csv     |
//|           exported by Scripts\XQAI_ExportCalendar.mq5            |
//| Nothing is invented: if no source is available the filter        |
//| reports UNAVAILABLE and the configured fail policy applies.      |
//+------------------------------------------------------------------+
#ifndef XQAI_NEWSFILTER_MQH
#define XQAI_NEWSFILTER_MQH

#include "Defines.mqh"
#include "TimeUtils.mqh"

#define XQ_NEWS_MAX 20000

class CNewsFilter
  {
private:
   datetime          m_time[];      // server time
   bool              m_fomc[];
   string            m_name[];
   int               m_count;
   datetime          m_lastRefresh;
   bool              m_liveOk, m_csvOk;
   string            m_keywords[];
   string            m_fomcKeys[];
   int               m_before, m_after, m_fomcWin;
   string            m_csv;
   CTimeModel       *m_tz;

   bool              Relevant(string name, const int importance, bool &isFomc)
     {
      StringToLower(name);
      isFomc = false;
      for(int k = 0; k < ArraySize(m_fomcKeys); k++)
         if(StringFind(name, m_fomcKeys[k]) >= 0)
            isFomc = true;
      if(importance >= 3)
         return true;
      for(int k = 0; k < ArraySize(m_keywords); k++)
         if(StringFind(name, m_keywords[k]) >= 0)
            return true;
      return false;
     }

   void              Add(const datetime serverTime, const string name, const bool fomc)
     {
      if(m_count >= XQ_NEWS_MAX)
         return;
      ArrayResize(m_time, m_count + 1);
      ArrayResize(m_fomc, m_count + 1);
      ArrayResize(m_name, m_count + 1);
      m_time[m_count] = serverTime;
      m_fomc[m_count] = fomc;
      m_name[m_count] = name;
      m_count++;
     }

   bool              LoadLive(void)
     {
      if(MQLInfoInteger(MQL_TESTER))
         return false;
      MqlCalendarValue values[];
      datetime now = TimeTradeServer();
      ResetLastError();
      int n = CalendarValueHistory(values, now - 2 * 86400, now + 7 * 86400, NULL, "USD");
      if(n < 0)
         return false;
      for(int i = 0; i < n; i++)
        {
         MqlCalendarEvent ev;
         if(!CalendarEventById(values[i].event_id, ev))
            continue;
         int imp = (ev.importance == CALENDAR_IMPORTANCE_HIGH) ? 3 : ((ev.importance == CALENDAR_IMPORTANCE_MODERATE) ? 2 : 1);
         bool fomc;
         if(Relevant(ev.name, imp, fomc))
            Add(values[i].time, ev.name, fomc);
        }
      return true;
     }

   bool              LoadCsv(void)
     {
      if(m_csv == "")
         return false;
      int h = FileOpen(m_csv, FILE_READ | FILE_CSV | FILE_ANSI | FILE_COMMON | FILE_SHARE_READ, ',');
      if(h == INVALID_HANDLE)
         return false;
      // header: time_utc,currency,importance,name
      for(int k = 0; k < 4 && !FileIsEnding(h); k++)
         FileReadString(h);
      while(!FileIsEnding(h))
        {
         string ts = FileReadString(h);
         if(ts == "")
            continue;
         string cur = FileReadString(h);
         string imp = FileReadString(h);
         string name = FileReadString(h);
         if(cur != "USD")
            continue;
         int im = (imp == "HIGH" || imp == "3") ? 3 : ((imp == "MODERATE" || imp == "2") ? 2 : 1);
         bool fomc;
         if(Relevant(name, im, fomc))
            Add(m_tz.ToServer((datetime)StringToInteger(ts)), name, fomc);
        }
      FileClose(h);
      return (m_count > 0);
     }

public:
                     CNewsFilter(void) : m_count(0), m_lastRefresh(0), m_liveOk(false), m_csvOk(false),
                     m_before(30), m_after(30), m_fomcWin(60), m_csv(""), m_tz(NULL) {}

   void              Init(CTimeModel *tz, const int beforeMin, const int afterMin, const int fomcMin, const string csvFile)
     {
      m_tz = tz;
      m_before = beforeMin;
      m_after = afterMin;
      m_fomcWin = fomcMin;
      m_csv = csvFile;
      string kw = "nonfarm,non-farm,payroll,cpi,consumer price,pce,fomc,interest rate decision,fed chair,powell,"
                  "unemployment,jobless,gdp,federal reserve,fed ";
      StringSplit(kw, ',', m_keywords);
      string fk = "fomc,interest rate decision,fed chair,powell";
      StringSplit(fk, ',', m_fomcKeys);
      Refresh(true);
     }

   void              Refresh(const bool force)
     {
      datetime now = TimeCurrent();
      if(!force && now - m_lastRefresh < 900)
         return;
      if(!force && m_csvOk && MQLInfoInteger(MQL_TESTER))
         return;                          // the tester loads the whole CSV history once
      m_lastRefresh = now;
      m_count = 0;
      ArrayResize(m_time, 0);
      ArrayResize(m_fomc, 0);
      ArrayResize(m_name, 0);
      m_liveOk = LoadLive();
      m_csvOk = false;
      if(!m_liveOk)
         m_csvOk = LoadCsv();
     }

   bool              Available(void) const { return m_liveOk || m_csvOk; }
   string            Source(void) const { return m_liveOk ? "MT5 calendar" : (m_csvOk ? "CSV" : "UNAVAILABLE"); }

   //--- true if serverTime is inside a blocking window; name of the event in 'what'
   bool              Blocked(const datetime serverTime, string &what)
     {
      what = "";
      for(int i = 0; i < m_count; i++)
        {
         int before = m_fomc[i] ? MathMax(m_fomcWin, m_before) : m_before;
         int after = m_fomc[i] ? MathMax(m_fomcWin, m_after) : m_after;
         if(serverTime >= m_time[i] - before * 60 && serverTime <= m_time[i] + after * 60)
           {
            what = m_name[i];
            return true;
           }
        }
      return false;
     }

   //--- next relevant event after serverTime (for the dashboard)
   string            Next(const datetime serverTime)
     {
      datetime best = 0;
      string nm = "";
      for(int i = 0; i < m_count; i++)
         if(m_time[i] >= serverTime && (best == 0 || m_time[i] < best))
           { best = m_time[i]; nm = m_name[i]; }
      if(best == 0)
         return "-";
      return nm + " @ " + TimeToString(best, TIME_DATE | TIME_MINUTES);
     }
  };

#endif
