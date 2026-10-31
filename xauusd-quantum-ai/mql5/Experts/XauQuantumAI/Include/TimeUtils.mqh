//+------------------------------------------------------------------+
//| TimeUtils.mqh - server time -> UTC, US/EU DST, trading sessions  |
//| Mirror of python/xqai/timeutils.py                               |
//+------------------------------------------------------------------+
#ifndef XQAI_TIMEUTILS_MQH
#define XQAI_TIMEUTILS_MQH

#include "Defines.mqh"

long XQ_DaysFromCivil(const int y, const int m, const int d)
  {
   MqlDateTime s;
   ZeroMemory(s);
   s.year = y; s.mon = m; s.day = d;
   return (long)(StructToTime(s) / 86400);
  }

int XQ_Dow(const long days) { return (int)((days + 4) % 7); }  // 0 = Sunday

long XQ_NthSunday(const int y, const int m, const int n)
  {
   long d1 = XQ_DaysFromCivil(y, m, 1);
   long first = d1 + (7 - XQ_Dow(d1)) % 7;
   return first + 7 * (n - 1);
  }

long XQ_LastSunday(const int y, const int m)
  {
   long nxt = (m == 12) ? XQ_DaysFromCivil(y + 1, 1, 1) : XQ_DaysFromCivil(y, m + 1, 1);
   long last = nxt - 1;
   return last - XQ_Dow(last);
  }

int XQ_Year(const datetime t)
  {
   MqlDateTime s;
   TimeToStruct(t, s);
   return s.year;
  }

bool XQ_UsDst(const datetime t)
  {
   long days = (long)t / 86400;
   int y = XQ_Year(t);
   return (days >= XQ_NthSunday(y, 3, 2) && days < XQ_NthSunday(y, 11, 1));
  }

bool XQ_EuDst(const datetime t)
  {
   long days = (long)t / 86400;
   int y = XQ_Year(t);
   return (days >= XQ_LastSunday(y, 3) && days < XQ_LastSunday(y, 10));
  }

//+------------------------------------------------------------------+
class CTimeModel
  {
public:
   ENUM_XQ_TZ        model;
   double            fixedHours;
   bool              useLiveOffset;   // live account: measure TimeTradeServer() - TimeGMT()

                     CTimeModel(void) : model(XQ_TZ_EET_US), fixedHours(2.0), useLiveOffset(true) {}

   long              ModelOffset(const datetime serverTime) const
     {
      if(model == XQ_TZ_FIXED)
         return (long)MathRound(fixedHours * 3600.0);
      if(model == XQ_TZ_EET_US)
         return XQ_UsDst(serverTime) ? 3 * 3600 : 2 * 3600;
      return XQ_EuDst(serverTime) ? 3 * 3600 : 2 * 3600;
     }

   long              LiveOffset(void) const
     {
      long diff = (long)(TimeTradeServer() - TimeGMT());
      return (long)(MathRound(diff / 1800.0) * 1800.0);
     }

   //--- offset to use for a given server time
   long              Offset(const datetime serverTime) const
     {
      if(useLiveOffset && !MQLInfoInteger(MQL_TESTER))
        {
         // the live offset is exact "now"; for historical/future times differing in DST
         // state from now we fall back to the model (same DST rules as the broker)
         long live = LiveOffset();
         long nowModel = ModelOffset(TimeTradeServer());
         long tModel = ModelOffset(serverTime);
         return live + (tModel - nowModel);
        }
      return ModelOffset(serverTime);
     }

   datetime          ToUTC(const datetime serverTime) const { return (datetime)((long)serverTime - Offset(serverTime)); }
   datetime          ToServer(const datetime utc) const
     {
      datetime approx = (datetime)((long)utc + ModelOffset(utc));
      return (datetime)((long)utc + Offset(approx));
     }
  };

//--- session of a UTC timestamp (London/NY in local time with their own DST)
int XQ_SessionOfUTC(const datetime utc)
  {
   long mod = ((long)utc % 86400) / 60;
   long lonOff = XQ_EuDst(utc) ? 60 : 0;
   long nyOff = XQ_UsDst(utc) ? -240 : -300;
   long lonOpen = 480 - lonOff, lonClose = 990 - lonOff;
   long nyOpen = 480 - nyOff, nyClose = 1020 - nyOff;
   bool inLon = (mod >= lonOpen && mod < lonClose);
   bool inNy = (mod >= nyOpen && mod < nyClose);
   if(inLon && inNy)
      return XQ_S_OVERLAP;
   if(inLon)
      return XQ_S_LONDON;
   if(inNy)
      return XQ_S_NEWYORK;
   if(mod < 480)
      return XQ_S_ASIA;
   return XQ_S_OFF;
  }

int XQ_WeekdayUTC(const datetime utc) { return (int)(((long)utc / 86400 + 4) % 7); }

#endif
