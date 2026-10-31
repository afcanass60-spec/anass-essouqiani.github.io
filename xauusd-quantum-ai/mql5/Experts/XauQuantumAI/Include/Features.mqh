//+------------------------------------------------------------------+
//| Features.mqh - per-timeframe data, indicators and structure      |
//| Mirror of python/xqai/features.py::compute_tf                    |
//| Bars are copied from shift 1 (closed bars only, no look-ahead).  |
//+------------------------------------------------------------------+
#ifndef XQAI_FEATURES_MQH
#define XQAI_FEATURES_MQH

#include "Defines.mqh"
#include "Indicators.mqh"
#include "Structure.mqh"

class CTFData
  {
public:
   ENUM_TIMEFRAMES   tf;
   int               n;
   bool              full;
   datetime          t[];
   double            o[], h[], l[], c[], v[], sp[];
   double            ema9[], ema20[], ema50[], ema100[], ema200[];
   double            rsi[], macd[], sig[], hist[], atr[], adx[], pdi[], mdi[];
   double            bw[];
   XQStructState     st;
   //--- last-bar scalars (index n-1)
   double            bbMid, bbUp, bbLo, bwSma100, atrSma100, volSma20;
   double            donchHi, donchLo;
   double            rsiMin10, rsiMax10;
   double            low3, low5, low10, high3, high5, high10;
   int               align;

                     CTFData(void) : tf(PERIOD_M5), n(0), full(true) {}

   int               Last(void) const { return n - 1; }

   //--- copy closed bars; returns false if history is not available yet
   bool              Load(const string symbol, const ENUM_TIMEFRAMES timeframe, const int bars)
     {
      tf = timeframe;
      MqlRates r[];
      ArraySetAsSeries(r, false);
      int got = CopyRates(symbol, tf, 1, bars, r);
      if(got <= 0)
        {
         n = 0;
         return false;
        }
      n = got;
      ArrayResize(t, n); ArrayResize(o, n); ArrayResize(h, n); ArrayResize(l, n);
      ArrayResize(c, n); ArrayResize(v, n); ArrayResize(sp, n);
      for(int i = 0; i < n; i++)
        {
         t[i] = r[i].time; o[i] = r[i].open; h[i] = r[i].high; l[i] = r[i].low; c[i] = r[i].close;
         v[i] = (double)r[i].tick_volume; sp[i] = (double)r[i].spread;
        }
      return true;
     }

   void              Compute(const int swingDepth, const bool fullSet)
     {
      full = fullSet;
      XQ_Ema(c, n, 20, ema20);
      if(!full || n < 3)
         return;
      XQ_Ema(c, n, 9, ema9);
      XQ_Ema(c, n, 50, ema50);
      XQ_Ema(c, n, 100, ema100);
      XQ_Ema(c, n, 200, ema200);
      XQ_Rsi(c, n, 14, rsi);
      XQ_Macd(c, n, macd, sig, hist);
      XQ_Atr(h, l, c, n, 14, atr);
      XQ_Adx(h, l, c, n, 14, adx, pdi, mdi);
      int i = n - 1;
      //--- Bollinger 20/2 on the last bar, bandwidth series for its 100-bar mean
      ArrayResize(bw, n);
      for(int k = 0; k < n; k++)
         bw[k] = 0.0;                                 // python: nan -> 0 before the SMA
      int startBw = MathMax(19, n - 100);
      for(int k = startBw; k < n; k++)
        {
         double m = XQ_SmaAt(c, k, 20);
         double s = XQ_StdAt(c, k, 20);
         bw[k] = (m != 0.0) ? 4.0 * s / m : 0.0;
        }
      bbMid = XQ_SmaAt(c, i, 20);
      double sd = XQ_StdAt(c, i, 20);
      bbUp = (bbMid == XQAI_NONE) ? XQAI_NONE : bbMid + 2.0 * sd;
      bbLo = (bbMid == XQAI_NONE) ? XQAI_NONE : bbMid - 2.0 * sd;
      bwSma100 = (i >= 19 + 99) ? XQ_SmaAt(bw, i, 100) : XQAI_NONE;
      atrSma100 = XQ_SmaAt(atr, i, 100);
      volSma20 = XQ_SmaAt(v, i, 20);
      donchHi = XQ_MaxAt(h, i - 1, 20);
      donchLo = XQ_MinAt(l, i - 1, 20);
      rsiMin10 = XQ_MinAt(rsi, i, 10);
      rsiMax10 = XQ_MaxAt(rsi, i, 10);
      low3 = XQ_MinAt(l, i, 3);   high3 = XQ_MaxAt(h, i, 3);
      low5 = XQ_MinAt(l, i, 5);   high5 = XQ_MaxAt(h, i, 5);
      low10 = XQ_MinAt(l, i, 10); high10 = XQ_MaxAt(h, i, 10);
      if(ema20[i] > ema50[i] && ema50[i] > ema200[i])
         align = 1;
      else
         if(ema20[i] < ema50[i] && ema50[i] < ema200[i])
            align = -1;
         else
            align = 0;
      XQ_ComputeStructure(o, h, l, c, atr, n, swingDepth, st);
     }

   //--- convenience accessors on the last closed bar
   double            C(void)  const { return c[n - 1]; }
   double            O(void)  const { return o[n - 1]; }
   double            H(void)  const { return h[n - 1]; }
   double            L(void)  const { return l[n - 1]; }
   double            V(void)  const { return v[n - 1]; }
   double            Spread(void) const { return sp[n - 1]; }
   double            ATR(void) const { return atr[n - 1]; }
   double            ADX(void) const { return adx[n - 1]; }
   double            RSI(void) const { return rsi[n - 1]; }
   double            RSIPrev(void) const { return rsi[n - 2]; }
   double            Hist(void) const { return hist[n - 1]; }
   double            HistPrev(void) const { return hist[n - 2]; }
   double            BW(void) const { return bw[n - 1]; }
   double            PO(void) const { return o[n - 2]; }
   double            PC(void) const { return c[n - 2]; }
   int               BarsSinceBreak(void) const { return (st.breakIdx >= 0) ? (n - 1 - st.breakIdx) : 9999; }
   int               SweepAge(void) const { return (st.sweepIdx >= 0) ? (n - 1 - st.sweepIdx) : 9999; }
   double            AtrRatio(void) const { return (atrSma100 != XQAI_NONE && atrSma100 > 0) ? atr[n - 1] / atrSma100 : XQAI_NONE; }
   double            BwRatio(void) const { return (bwSma100 != XQAI_NONE && bwSma100 > 0) ? bw[n - 1] / bwSma100 : XQAI_NONE; }
   double            VolRatio(void) const { return (volSma20 != XQAI_NONE && volSma20 > 0) ? v[n - 1] / volSma20 : XQAI_NONE; }

   //--- price touches a bullish (d=+1) / bearish (d=-1) FVG or order block
   bool              InZone(const int d) const
     {
      int i = n - 1;
      if(d == 1)
        {
         bool z1 = (st.fvgBullT >= 0 && l[i] <= st.fvgBullTop && c[i] >= st.fvgBullBot);
         bool z2 = (st.obBullT >= 0 && l[i] <= st.obBullTop && c[i] >= st.obBullBot);
         return z1 || z2;
        }
      bool z3 = (st.fvgBearT >= 0 && h[i] >= st.fvgBearBot && c[i] <= st.fvgBearTop);
      bool z4 = (st.obBearT >= 0 && h[i] >= st.obBearBot && c[i] <= st.obBearTop);
      return z3 || z4;
     }
  };

//--- anchored VWAP of the current UTC day on M5 (needs server->UTC conversion)
double XQ_AnchoredVwapLast(const CTFData &m5, const long utcOffsetSeconds)
  {
   int i = m5.n - 1;
   if(i < 0)
      return XQAI_NONE;
   long day = ((long)m5.t[i] - utcOffsetSeconds) / 86400;
   double pv = 0.0, vv = 0.0;
   for(int k = i; k >= 0; k--)
     {
      if(((long)m5.t[k] - utcOffsetSeconds) / 86400 != day)
         break;
      double vol = (m5.v[k] > 0) ? m5.v[k] : 1.0;
      pv += (m5.h[k] + m5.l[k] + m5.c[k]) / 3.0 * vol;
      vv += vol;
     }
   return (vv > 0) ? pv / vv : XQAI_NONE;
  }

#endif
