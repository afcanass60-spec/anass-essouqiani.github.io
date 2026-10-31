//+------------------------------------------------------------------+
//| Bridge.mqh - file protocol with the Python AI service            |
//| See python/xqai/bridge/protocol.py. All files in Common\Files\XQAI|
//| Fail-safe: timeout, malformed or REJECT answer => NOT validated. |
//+------------------------------------------------------------------+
#ifndef XQAI_BRIDGE_MQH
#define XQAI_BRIDGE_MQH

#include "Defines.mqh"

class CBridge
  {
private:
   long              m_seq;
   bool              m_pending;
   long              m_pendingSeq;
   ulong             m_sentMs;
   int               m_timeoutMs;
   int               m_heartbeatMaxAge;
   string            m_modelId;

   string            ReadAll(const string file)
     {
      int h = FileOpen(file, FILE_READ | FILE_TXT | FILE_ANSI | FILE_COMMON | FILE_SHARE_READ);
      if(h == INVALID_HANDLE)
         return "";
      string s = "";
      while(!FileIsEnding(h))
         s += FileReadString(h);
      FileClose(h);
      return s;
     }

public:
                     CBridge(void) : m_seq(0), m_pending(false), m_pendingSeq(0), m_sentMs(0),
                     m_timeoutMs(3000), m_heartbeatMaxAge(15), m_modelId("") {}

   void              Init(const int timeoutMs, const int heartbeatMaxAge)
     {
      m_timeoutMs = timeoutMs;
      m_heartbeatMaxAge = heartbeatMaxAge;
      m_seq = (long)TimeLocal() * 10;   // unique across restarts
      FolderCreate("XQAI", FILE_COMMON);
     }

   bool              Pending(void) const { return m_pending; }
   string            ModelId(void) const { return m_modelId; }

   //--- service alive = heartbeat file rewritten recently with status OK
   bool              Alive(void)
     {
      string s = ReadAll(XQAI_FOLDER + "heartbeat.txt");
      if(s == "")
         return false;
      string p[];
      if(StringSplit(s, ',', p) < 3)
         return false;
      long ts = StringToInteger(p[0]);
      m_modelId = p[1];
      string st = p[2];
      StringTrimRight(st);
      long age = (long)TimeGMT() - ts;
      if(MQLInfoInteger(MQL_TESTER))
         return false;                    // the Strategy Tester cannot talk to a live service
      return (age >= -5 && age <= m_heartbeatMaxAge && st == "OK");
     }

   bool              Send(const string symbol, const string strategy, const int dir, const double &f[])
     {
      if(m_pending)
         return false;
      m_seq++;
      string line = StringFormat("%I64d,%I64d,%s,%s,%d", m_seq, (long)TimeGMT(), symbol, strategy, dir);
      for(int k = 0; k < ArraySize(f); k++)
         line += "," + DoubleToString(f[k], 8);
      string tmp = XQAI_FOLDER + StringFormat("req_%I64d.tmp", m_seq);
      string fin = XQAI_FOLDER + StringFormat("req_%I64d.csv", m_seq);
      int h = FileOpen(tmp, FILE_WRITE | FILE_TXT | FILE_ANSI | FILE_COMMON);
      if(h == INVALID_HANDLE)
         return false;
      FileWriteString(h, line);
      FileClose(h);
      if(!FileMove(tmp, FILE_COMMON, fin, FILE_COMMON | FILE_REWRITE))
        {
         FileDelete(tmp, FILE_COMMON);
         return false;
        }
      m_pending = true;
      m_pendingSeq = m_seq;
      m_sentMs = GetTickCount64();
      return true;
     }

   //--- returns 1 = answer received (prob filled), 0 = still waiting, -1 = timeout / rejected / error
   int               Poll(double &prob)
     {
      prob = -1.0;
      if(!m_pending)
         return -1;
      string fin = XQAI_FOLDER + StringFormat("resp_%I64d.csv", m_pendingSeq);
      if(FileIsExist(fin, FILE_COMMON))
        {
         string s = ReadAll(fin);
         FileDelete(fin, FILE_COMMON);
         m_pending = false;
         string p[];
         if(StringSplit(s, ',', p) < 4)
            return -1;
         if(StringToInteger(p[0]) != m_pendingSeq)
            return -1;
         string st = p[3];
         StringTrimRight(st);
         if(st != "OK")
            return -1;
         prob = StringToDouble(p[1]);
         if(!MathIsValidNumber(prob) || prob < 0.0 || prob > 1.0)
           {
            prob = -1.0;
            return -1;
           }
         return 1;
        }
      if(GetTickCount64() - m_sentMs > (ulong)m_timeoutMs)
        {
         m_pending = false;
         FileDelete(XQAI_FOLDER + StringFormat("req_%I64d.csv", m_pendingSeq), FILE_COMMON);
         return -1;
        }
      return 0;
     }

   void              Cancel(void) { m_pending = false; }
  };

#endif
