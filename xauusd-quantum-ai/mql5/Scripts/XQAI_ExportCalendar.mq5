//+------------------------------------------------------------------+
//|                                         XQAI_ExportCalendar.mq5  |
//| Exports USD events of the MetaQuotes economic calendar to        |
//|   <Common>\Files\XQAI\calendar.csv  (time_utc,currency,          |
//|   importance,name) for the Strategy Tester and Python backtests. |
//| The calendar is not available inside the Strategy Tester, hence  |
//| this export, run on a live (demo is fine) chart.                 |
//+------------------------------------------------------------------+
#property script_show_inputs
#property description "Export the economic calendar (USD) for backtests"

#include "..\Experts\XauQuantumAI\Include\TimeUtils.mqh"

input int        InpYears     = 6;
input bool       InpHighOnly  = false;          // false = all importances (the filter selects later)
input ENUM_XQ_TZ InpServerTZ  = XQ_TZ_EET_US;   // broker time zone model (calendar times are server time)
input double     InpFixedGMT  = 2.0;

string Imp(const ENUM_CALENDAR_EVENT_IMPORTANCE i)
  {
   if(i == CALENDAR_IMPORTANCE_HIGH)
      return "HIGH";
   if(i == CALENDAR_IMPORTANCE_MODERATE)
      return "MODERATE";
   if(i == CALENDAR_IMPORTANCE_LOW)
      return "LOW";
   return "NONE";
  }

void OnStart(void)
  {
   CTimeModel tz;
   tz.model = InpServerTZ;
   tz.fixedHours = InpFixedGMT;
   tz.useLiveOffset = true;
   datetime to = TimeTradeServer() + 30 * 86400;
   datetime from = to - (datetime)((long)InpYears * 365 * 86400);
   MqlCalendarValue v[];
   int n = CalendarValueHistory(v, from, to, NULL, "USD");
   if(n <= 0)
     {
      PrintFormat("CalendarValueHistory returned %d (err %d). Is the terminal connected?", n, GetLastError());
      return;
     }
   FolderCreate("XQAI", FILE_COMMON);
   int h = FileOpen("XQAI\\calendar.csv", FILE_WRITE | FILE_TXT | FILE_ANSI | FILE_COMMON);
   if(h == INVALID_HANDLE)
     {
      Print("cannot write calendar.csv");
      return;
     }
   FileWriteString(h, "time_utc,currency,importance,name\r\n");
   int written = 0;
   for(int i = 0; i < n; i++)
     {
      MqlCalendarEvent ev;
      if(!CalendarEventById(v[i].event_id, ev))
         continue;
      if(InpHighOnly && ev.importance != CALENDAR_IMPORTANCE_HIGH)
         continue;
      string name = ev.event_code + " " + ev.name;   // code = language-independent slug
      StringReplace(name, ",", " ");
      FileWriteString(h, StringFormat("%I64d,USD,%s,%s\r\n", (long)tz.ToUTC(v[i].time), Imp(ev.importance), name));
      written++;
     }
   FileClose(h);
   PrintFormat("%d USD events written to Common\\Files\\XQAI\\calendar.csv (%s -> %s)", written,
               TimeToString(from), TimeToString(to));
  }
//+------------------------------------------------------------------+
