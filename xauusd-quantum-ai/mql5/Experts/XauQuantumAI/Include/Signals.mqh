//+------------------------------------------------------------------+
//| Signals.mqh - regime, 6 strategies, structural SL/TP, 100-pt     |
//| score and the 40-feature AI vector.                              |
//| Line-by-line mirror of python/xqai/signals.py                    |
//+------------------------------------------------------------------+
#ifndef XQAI_SIGNALS_MQH
#define XQAI_SIGNALS_MQH

#include "Defines.mqh"
#include "Features.mqh"
#include "TimeUtils.mqh"

struct XQSignalParams
  {
   double            w[XQAI_N_COMPONENTS];          // normalised to sum 100
   double            minRR, minRRMeanRev, rrTarget, maxRR;
   double            slBufferATR, minSlATR, maxSlATR;
   double            point;
   bool              enabled[XQAI_N_STRATEGIES];
   bool              regimeMask[XQAI_N_REGIMES * XQAI_N_STRATEGIES];  // [regime * 6 + strategy]
   int               warmup;
  };

struct XQM1Info
  {
   double            o, c, ema20;
   bool              ok;
  };

//--- parses "TU:PB,MO,BO|TD:PB|..." into the regime/strategy matrix
bool XQ_ParseRegimeMatrix(const string text, XQSignalParams &p)
  {
   for(int k = 0; k < XQAI_N_REGIMES * XQAI_N_STRATEGIES; k++)
      p.regimeMask[k] = false;
   string parts[];
   int np = StringSplit(text, '|', parts);
   for(int i = 0; i < np; i++)
     {
      string kv[];
      if(StringSplit(parts[i], ':', kv) < 1)
         continue;
      string rc = kv[0];
      StringTrimLeft(rc);
      StringTrimRight(rc);
      int reg = -1;
      for(int r = 0; r < XQAI_N_REGIMES; r++)
         if(XQ_RegimeCode(r) == rc)
            reg = r;
      if(reg < 0)
         return false;
      if(ArraySize(kv) < 2)
         continue;
      string codes[];
      int nc = StringSplit(kv[1], ',', codes);
      for(int j = 0; j < nc; j++)
        {
         string sc = codes[j];
         StringTrimLeft(sc);
         StringTrimRight(sc);
         if(sc == "")
            continue;
         int st = -1;
         for(int s = 0; s < XQAI_N_STRATEGIES; s++)
            if(XQ_StrategyCode(s) == sc)
               st = s;
         if(st < 0)
            return false;
         p.regimeMask[reg * XQAI_N_STRATEGIES + st] = true;
        }
     }
   return true;
  }

//--- parses "PB:0,0.3,0.55|SW:0,0.35,0.6|BO:0" (fractions of the entry->SL distance, 0 = market leg)
//--- into f[strategy * XQ_MAX_LEGS + k] / cnt[strategy]. Missing strategy = market entry only.
bool XQ_ParseScaleLevels(const string text, double &f[], int &cnt[])
  {
   for(int s = 0; s < XQAI_N_STRATEGIES; s++)
     {
      cnt[s] = 1;
      for(int k = 0; k < XQ_MAX_LEGS; k++)
         f[s * XQ_MAX_LEGS + k] = 0.0;
     }
   string parts[];
   int np = StringSplit(text, '|', parts);
   for(int i = 0; i < np; i++)
     {
      string kv[];
      if(StringSplit(parts[i], ':', kv) < 2)
         continue;
      string code = kv[0];
      StringTrimLeft(code);
      StringTrimRight(code);
      int st = -1;
      for(int s = 0; s < XQAI_N_STRATEGIES; s++)
         if(XQ_StrategyCode(s) == code)
            st = s;
      if(st < 0)
         return false;
      string vals[];
      int nv = StringSplit(kv[1], ',', vals);
      if(nv < 1 || nv > XQ_MAX_LEGS)
         return false;
      double prev = -1.0;
      for(int k = 0; k < nv; k++)
        {
         double v = StringToDouble(vals[k]);
         if((k == 0 && v != 0.0) || v < 0.0 || v >= 0.9 || v <= prev)
            return false;
         f[st * XQ_MAX_LEGS + k] = v;
         prev = v;
        }
      cnt[st] = nv;
     }
   return true;
  }

//--- validity of the decision row (same rule as features.py "valid")
bool XQ_RowValid(const CTFData &m5, const CTFData &m15, const CTFData &m30, const CTFData &h1, const CTFData &h4,
                 const int warmup)
  {
   if(m5.n <= warmup || m15.n <= warmup || m30.n <= warmup || h1.n <= warmup || h4.n <= warmup)
      return false;
   if(m5.bwSma100 == XQAI_NONE || h1.atrSma100 == XQAI_NONE)
      return false;
   return (m5.ATR() > 0);
  }

int XQ_Regime(const CTFData &m15, const CTFData &h1)
  {
   double atrRatio = h1.AtrRatio();
   double bwRatio = m15.BwRatio();
   double adx = h1.ADX();
   int al = h1.align;
   if(atrRatio != XQAI_NONE && atrRatio > 2.0)
      return XQ_R_VOLATILE;
   if(adx >= 25 && al == 1)
      return XQ_R_TREND_UP;
   if(adx >= 25 && al == -1)
      return XQ_R_TREND_DOWN;
   if(bwRatio != XQAI_NONE && bwRatio < 0.7 && adx < 20)
      return XQ_R_SQUEEZE;
   if(adx < 20)
      return XQ_R_RANGE;
   return XQ_R_TRANSITION;
  }

//--- engulfing / pin bar in direction d and close position in the bar (d-oriented)
void XQ_PriceAction(const CTFData &m5, const int d, bool &pattern, double &cposD)
  {
   int i = m5.n - 1;
   double o = m5.o[i], h = m5.h[i], l = m5.l[i], c = m5.c[i];
   double po = m5.o[i - 1], pc = m5.c[i - 1];
   double body = MathAbs(c - o), pbody = MathAbs(pc - po), rng = h - l;
   double cpos = (rng > 0) ? (c - l) / rng : 0.5;
   bool engulf;
   double wick;
   if(d == 1)
     {
      engulf = (c > o && pc < po && c >= po && o <= pc && body > pbody);
      wick = MathMin(o, c) - l;
      cposD = cpos;
     }
   else
     {
      engulf = (c < o && pc > po && c <= po && o >= pc && body > pbody);
      wick = h - MathMax(o, c);
      cposD = 1.0 - cpos;
     }
   bool pin = (rng > 0 && wick >= 2.0 * body && wick >= 0.6 * rng);
   pattern = engulf || pin;
  }

//--- full evaluation of one (strategy, direction) pair
void XQ_EvaluateOne(const int s, const int d, const int reg, const bool rowValid,
                    const CTFData &m5, const CTFData &m15, const CTFData &m30, const CTFData &h1, const CTFData &h4,
                    const XQM1Info &m1, const XQSignalParams &p, XQCandidate &cand)
  {
   ZeroMemory(cand);
   cand.valid = false;
   cand.strategy = s;
   cand.dir = d;
   cand.regime = reg;
   int i = m5.n - 1;
   double atr = m5.ATR();
   double c = m5.C();
   cand.entryRef = c;

   bool pattern;
   double cpos;
   XQ_PriceAction(m5, d, pattern, cpos);
   bool bull = (m5.C() - m5.O()) * d > 0;
   bool zone = m5.InZone(d) || m15.InZone(d);
   double rsi = m5.RSI();
   double hist = m5.Hist(), histPrev = m5.HistPrev();
   double volRatio = m5.VolRatio();
   double low3 = (d == 1) ? m5.low3 : m5.high3;
   double low5 = (d == 1) ? m5.low5 : m5.high5;
   double low10 = (d == 1) ? m5.low10 : m5.high10;
   double ext = (d == 1) ? m5.L() : m5.H();
   double opp15 = (d == 1) ? m15.st.shLast : m15.st.slLast;
   double opp1h = (d == 1) ? h1.st.shLast : h1.st.slLast;
   double own5 = (d == 1) ? m5.st.slLast : m5.st.shLast;
   int alH1 = h1.align, alH4 = h4.align;
   int e15 = XQ_Sign(m15.ema20[m15.n - 1] - m15.ema50[m15.n - 1]);
   int e30 = XQ_Sign(m30.ema20[m30.n - 1] - m30.ema50[m30.n - 1]);
   int e200 = XQ_Sign(m5.C() - m5.ema200[i]);
   bool brkD = (m5.st.breakDir == d);
   int bsb = m5.BarsSinceBreak();
   int btype = m5.st.breakType;
   bool sweep5 = (m5.st.sweepDir == d);
   bool sweep15 = (m15.st.sweepDir == d);
   int age5 = m5.SweepAge(), age15 = m15.SweepAge();
   double rsiExt = (d == 1) ? m5.rsiMin10 : 100.0 - m5.rsiMax10;
   double rsiD = (d == 1) ? rsi : 100.0 - rsi;
   double rsiPrevD = (d == 1) ? m5.RSIPrev() : 100.0 - m5.RSIPrev();
   double bbBand = (d == 1) ? m5.bbLo : m5.bbUp;
   double bwRatio15 = m15.BwRatio();
   double adx15 = m15.ADX();

   bool cond = false;
   double slRaw = XQAI_NONE, target = XQAI_NONE;
   bool trendMode = true;
   switch(s)
     {
      case XQ_TREND_PULLBACK:
        {
         bool touch = (low3 - (m5.ema20[i] + d * 0.2 * atr)) * d <= 0;
         cond = ((touch || zone) && (c - m5.ema20[i]) * d > 0 && (c - m5.ema50[i]) * d > 0
                 && (pattern || (bull && cpos >= 0.7)) && rsiD >= 40 && rsiD <= 70);
         slRaw = low5 - d * p.slBufferATR * atr;
         target = opp15;
         trendMode = true;
         break;
        }
      case XQ_MOMENTUM:
        {
         cond = (brkD && btype == XQ_BOS && bsb == 0 && hist * d > 0 && (hist - histPrev) * d > 0
                 && adx15 > 25 && volRatio != XQAI_NONE && volRatio >= 1.2 && rsiD >= 55 && rsiD <= 75);
         double base = (own5 == XQAI_NONE) ? low5 : own5;
         slRaw = base - d * p.slBufferATR * atr;
         target = opp1h;
         trendMode = true;
         break;
        }
      case XQ_BREAKOUT:
        {
         double lvl = (d == 1) ? m5.donchHi : m5.donchLo;
         cond = (lvl != XQAI_NONE && (c - lvl) * d > 0 && volRatio != XQAI_NONE && volRatio >= 1.5 && cpos >= 0.7
                 && bull && bwRatio15 != XQAI_NONE && bwRatio15 < 1.2);
         slRaw = ext - d * p.slBufferATR * atr;
         if(m5.donchHi != XQAI_NONE && m5.donchLo != XQAI_NONE)
            target = c + d * (m5.donchHi - m5.donchLo);
         trendMode = true;
         break;
        }
      case XQ_LIQ_SWEEP:
        {
         cond = (((sweep5 && age5 <= 3) || (sweep15 && age15 == 0)) && bull && cpos >= 0.6 && rsiD < 60);
         slRaw = low5 - d * p.slBufferATR * atr;
         target = opp15;
         trendMode = false;
         break;
        }
      case XQ_REVERSAL:
        {
         cond = (brkD && btype == XQ_CHOCH && bsb <= 3 && rsiExt != XQAI_NONE && rsiExt < 35
                 && !(h4.ADX() > 30 && alH4 == -d));
         slRaw = low10 - d * p.slBufferATR * atr;
         target = opp15;
         trendMode = false;
         break;
        }
      default: // XQ_MEAN_REVERSION
        {
         cond = (bbBand != XQAI_NONE && (low3 - bbBand) * d < 0 && MathMin(rsiD, rsiPrevD) < 30 && bull && cpos >= 0.6);
         slRaw = low3 - d * (p.slBufferATR + 0.2) * atr;
         target = m5.bbMid;
         trendMode = false;
         break;
        }
     }

   //--- regime and direction gates
   bool allowed = p.regimeMask[reg * XQAI_N_STRATEGIES + s] && p.enabled[s];
   if(!XQ_IsCounterTrend(s))
     {
      if(reg == XQ_R_TREND_UP && d != 1)
         allowed = false;
      if(reg == XQ_R_TREND_DOWN && d != -1)
         allowed = false;
      if(reg == XQ_R_TRANSITION && alH4 != d)
         allowed = false;
     }

   //--- structural stop, clamped to [minSl, maxSl] ATR
   double risk = (c - slRaw) * d;
   if(risk < p.minSlATR * atr)
      risk = p.minSlATR * atr;
   bool okSl = (risk <= p.maxSlATR * atr);
   double sl = c - d * risk;
   //--- take profit from structure
   bool hasT = (target != XQAI_NONE && (target - c) * d > 0);
   double tdist = hasT ? (target - c) * d : 0.0;
   double minRRs = (s == XQ_MEAN_REVERSION) ? p.minRRMeanRev : p.minRR;
   double tpd = 0.0;
   bool okTp;
   if(trendMode)
     {
      double floorRR = MathMax(p.rrTarget, p.minRR);
      double tpFar = MathMin(MathMax(tdist - 0.1 * atr, floorRR * risk), p.maxRR * risk);
      tpd = (hasT && tdist >= minRRs * risk) ? tpFar : floorRR * risk;
      okTp = !(hasT && tdist < 1.0 * risk);
     }
   else
     {
      tpd = hasT ? MathMin(tdist - 0.1 * atr, p.maxRR * risk) : 0.0;
      okTp = hasT && tpd >= minRRs * risk;
     }
   double tp = c + d * tpd;
   cand.sl = sl;
   cand.tp = tp;
   cand.risk = risk;
   cand.rr = (risk > 0) ? tpd / risk : 0.0;
   cand.valid = (cond && allowed && okSl && okTp && rowValid && atr > 0);

   //--- score components
   bool counter = XQ_IsCounterTrend(s);
   double a = (brkD && bsb <= 10) ? 1.0 : 0.0;
   int st15 = m15.st.trend;
   double b;
   if(counter)
      b = (st15 != -d) ? 1.0 : 0.3;
   else
      b = (st15 == d) ? 1.0 : ((st15 == 0) ? 0.5 : 0.0);
   double cz = (zone || (sweep5 && age5 <= 5)) ? 1.0 : 0.0;
   double compS = 0.4 * a + 0.3 * b + 0.3 * cz;

   double compT;
   if(counter)
      compT = 1.0 - ((alH1 == -d && h1.ADX() > 25) ? 0.5 : 0.0) - ((alH4 == -d && h4.ADX() > 25) ? 0.5 : 0.0);
   else
     {
      double fH1 = (alH1 == d) ? 1.0 : ((alH1 == 0) ? 0.5 : 0.0);
      double fH4 = (alH4 == d) ? 1.0 : ((alH4 == 0) ? 0.5 : 0.0);
      compT = 0.35 * fH1 + 0.25 * fH4 + 0.2 * ((e15 == d) ? 1.0 : 0.0) + 0.2 * ((e200 == d) ? 1.0 : 0.0);
     }

   bool slope = (hist - histPrev) * d > 0;
   double mRsi, mMacd, mAdx;
   if(counter)
     {
      mRsi = (rsiExt < 35) ? 1.0 : ((rsiExt < 45) ? 0.5 : 0.0);
      mMacd = slope ? 1.0 : 0.0;
      mAdx = (adx15 < 25) ? 1.0 : 0.5;
     }
   else
     {
      mRsi = (rsiD >= 50 && rsiD <= 70) ? 1.0 : ((rsiD >= 40 && rsiD < 50) ? 0.5 : 0.0);
      mMacd = (hist * d > 0) ? (0.5 + (slope ? 0.5 : 0.0)) : 0.0;
      mAdx = (adx15 >= 25) ? 1.0 : ((adx15 >= 20) ? 0.5 : 0.0);
     }
   double compM = (mRsi + mMacd + mAdx) / 3.0;

   double lSw = ((sweep5 && age5 <= 5) || (sweep15 && age15 <= 2)) ? 0.5 : 0.0;
   double d15 = (opp15 != XQAI_NONE) ? (opp15 - c) * d : -1.0;
   double d1h = (opp1h != XQAI_NONE) ? (opp1h - c) * d : -1.0;
   bool has15 = d15 > 0, has1h = d1h > 0;
   double lRoom;
   if(!has15 && !has1h)
      lRoom = 0.5;
   else
     {
      double room = has15 ? d15 : d1h;
      if(has15 && has1h)
         room = MathMin(d15, d1h);
      double roomR = (risk > 0) ? room / risk : 0.0;
      lRoom = (roomR >= p.minRR) ? 0.5 : ((roomR >= 1.0) ? 0.25 : 0.0);
     }
   double compL = lSw + lRoom;

   double ar = m5.AtrRatio();
   double sp = (atr > 0) ? m5.Spread() * p.point / atr : 1.0;
   double vAr = 0.0;
   if(ar != XQAI_NONE)
      vAr = (ar >= 0.7 && ar <= 1.8) ? 0.6 : ((ar >= 0.5 && ar <= 2.5) ? 0.2 : 0.0);
   double vSp = (sp <= 0.1) ? 0.4 : ((sp <= 0.2) ? 0.2 : 0.0);
   double compV = vAr + vSp;

   double compP = (pattern ? 0.6 : 0.0) + ((cpos >= 0.7) ? 0.4 : ((cpos >= 0.55) ? 0.2 : 0.0));

   bool m1c = m1.ok && (m1.c - m1.o) * d > 0 && (m1.c - m1.ema20) * d > 0;
   double mid;
   if(!counter)
      mid = (e15 == d && e30 == d) ? 0.3 : 0.0;
   else
      mid = (m30.st.trend != -d) ? 0.3 : 0.0;
   double compX = (m1c ? 0.4 : 0.0) + mid + ((alH4 != -d) ? 0.3 : 0.0);

   cand.comp[XQ_C_STRUCTURE] = XQ_Clip01(compS);
   cand.comp[XQ_C_TREND] = XQ_Clip01(compT);
   cand.comp[XQ_C_MOMENTUM] = XQ_Clip01(compM);
   cand.comp[XQ_C_LIQUIDITY] = XQ_Clip01(compL);
   cand.comp[XQ_C_VOLATILITY] = XQ_Clip01(compV);
   cand.comp[XQ_C_PRICEACTION] = XQ_Clip01(compP);
   cand.comp[XQ_C_MTF] = XQ_Clip01(compX);
   double score = 0.0;
   for(int k = 0; k < XQAI_N_COMPONENTS; k++)
      score += p.w[k] * cand.comp[k];
   cand.score = score;
  }

//--- evaluates the 12 candidates and returns the best valid one (strategy order, buy before sell)
bool XQ_BestCandidate(const CTFData &m5, const CTFData &m15, const CTFData &m30, const CTFData &h1, const CTFData &h4,
                      const XQM1Info &m1, const XQSignalParams &p, XQCandidate &best, XQCandidate &all[], int &regime)
  {
   bool rowValid = XQ_RowValid(m5, m15, m30, h1, h4, p.warmup);
   regime = rowValid ? XQ_Regime(m15, h1) : XQ_R_TRANSITION;
   ArrayResize(all, 2 * XQAI_N_STRATEGIES);
   bool found = false;
   double bestScore = -1.0;
   int k = 0;
   for(int s = 0; s < XQAI_N_STRATEGIES; s++)
     {
      for(int dd = 0; dd < 2; dd++)
        {
         int d = (dd == 0) ? 1 : -1;
         if(rowValid)
            XQ_EvaluateOne(s, d, regime, rowValid, m5, m15, m30, h1, h4, m1, p, all[k]);
         else
           {
            ZeroMemory(all[k]);
            all[k].valid = false;
           }
         if(all[k].valid && all[k].score > bestScore)
           {
            bestScore = all[k].score;
            best = all[k];
            found = true;
           }
         k++;
        }
     }
   return found;
  }

//--- 40 features (spec v1) for a candidate, identical order to signals.py::ai_features
void XQ_AIFeatures(const XQCandidate &cand, const CTFData &m5, const CTFData &m15, const CTFData &h1,
                   const datetime decisionUTC, const double point, double &f[])
  {
   ArrayResize(f, XQAI_N_FEATURES);
   ArrayInitialize(f, 0.0);
   for(int k = 0; k < XQAI_N_COMPONENTS; k++)
      f[k] = cand.comp[k];
   f[7 + cand.strategy] = 1.0;
   f[13] = cand.dir;
   f[14 + cand.regime] = 1.0;
   int d = cand.dir;
   double atr5 = m5.ATR(), atrh1 = h1.ATR();
   double v;
   v = m5.AtrRatio();  f[20] = (v != XQAI_NONE) ? v : 0.0;
   v = h1.AtrRatio();  f[21] = (v != XQAI_NONE) ? v : 0.0;
   f[22] = m15.ADX() / 50.0;
   f[23] = h1.ADX() / 50.0;
   f[24] = d * (m5.RSI() - 50.0) / 50.0;
   f[25] = (atr5 > 0) ? d * m5.Hist() / atr5 : 0.0;
   v = m15.BwRatio();  f[26] = (v != XQAI_NONE) ? v : 0.0;
   v = m5.VolRatio();  f[27] = (v != XQAI_NONE) ? v : 0.0;
   f[28] = (atr5 > 0) ? d * (m5.C() - m5.ema50[m5.n - 1]) / atr5 : 0.0;
   f[29] = (atrh1 > 0) ? d * (m5.C() - h1.ema200[h1.n - 1]) / atrh1 : 0.0;
   f[30] = (atr5 > 0) ? cand.risk / atr5 : 0.0;
   f[31] = cand.rr;
   int sess = XQ_SessionOfUTC(decisionUTC);
   if(sess >= 0 && sess < 4)
      f[32 + sess] = 1.0;
   double hour = (double)((long)decisionUTC % 86400) / 3600.0;
   f[36] = MathSin(2.0 * M_PI * hour / 24.0);
   f[37] = MathCos(2.0 * M_PI * hour / 24.0);
   f[38] = (atr5 > 0) ? m5.Spread() * point / atr5 : 0.0;
   f[39] = cand.score / 100.0;
   for(int k = 0; k < XQAI_N_FEATURES; k++)
      if(!MathIsValidNumber(f[k]))
         f[k] = 0.0;
  }

#endif
