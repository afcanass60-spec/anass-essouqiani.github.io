//+------------------------------------------------------------------+
//|                                          XQAI_ExportHistory.mq5  |
//| Exports M1..H4 bars of the chart symbol to                       |
//|   <Common>\Files\XQAI\data\<SYMBOL>_<TF>.csv                     |
//| columns: time(epoch, server time),open,high,low,close,           |
//|          tick_volume,spread                                      |
//| Used by python/scripts/xqai_cli.py (--data).                     |
//+------------------------------------------------------------------+
#property script_show_inputs
#property description "Export broker history for the Python research engine"

input int      InpYears      = 6;          // years of history (M1 history may be shorter at your broker)
input string   InpOutName    = "XAUUSD";   // file prefix (keep XAUUSD even if the symbol has a suffix)

bool ExportTF(const ENUM_TIMEFRAMES tf, const string tfName)
  {
   datetime to = TimeCurrent();
   datetime from = to - (datetime)((long)InpYears * 365 * 86400);
   MqlRates r[];
   ArraySetAsSeries(r, false);
   int n = CopyRates(_Symbol, tf, from, to, r);
   if(n <= 0)
     {
      PrintFormat("%s: CopyRates failed (err %d). Open the chart / scroll back to download history, then retry.",
                  tfName, GetLastError());
      return false;
     }
   string file = "XQAI\\data\\" + InpOutName + "_" + tfName + ".csv";
   int h = FileOpen(file, FILE_WRITE | FILE_TXT | FILE_ANSI | FILE_COMMON);
   if(h == INVALID_HANDLE)
     {
      PrintFormat("cannot write %s (err %d)", file, GetLastError());
      return false;
     }
   FileWriteString(h, "time,open,high,low,close,tick_volume,spread\r\n");
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   for(int i = 0; i < n; i++)
      FileWriteString(h, StringFormat("%I64d,%s,%s,%s,%s,%I64d,%d\r\n", (long)r[i].time,
                                      DoubleToString(r[i].open, digits), DoubleToString(r[i].high, digits),
                                      DoubleToString(r[i].low, digits), DoubleToString(r[i].close, digits),
                                      r[i].tick_volume, r[i].spread));
   FileClose(h);
   PrintFormat("%s: %d bars %s -> %s written to Common\\Files\\%s", tfName, n,
               TimeToString(r[0].time), TimeToString(r[n - 1].time), file);
   return true;
  }

void OnStart(void)
  {
   FolderCreate("XQAI", FILE_COMMON);
   FolderCreate("XQAI\\data", FILE_COMMON);
   ENUM_TIMEFRAMES tfs[6] = {PERIOD_M1, PERIOD_M5, PERIOD_M15, PERIOD_M30, PERIOD_H1, PERIOD_H4};
   string names[6] = {"M1", "M5", "M15", "M30", "H1", "H4"};
   int ok = 0;
   for(int k = 0; k < 6; k++)
      if(ExportTF(tfs[k], names[k]))
         ok++;
   PrintFormat("export finished: %d/6 timeframes. Contract: size=%g vmin=%g step=%g point=%g digits=%d",
               ok, SymbolInfoDouble(_Symbol, SYMBOL_TRADE_CONTRACT_SIZE), SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN),
               SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP), _Point, _Digits);
  }
//+------------------------------------------------------------------+
