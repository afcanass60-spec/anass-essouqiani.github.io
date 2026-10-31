//+------------------------------------------------------------------+
//| Structure.mqh - market structure state machine                   |
//| swings, HH/HL/LH/LL, BOS, CHOCH, sweeps, FVG, order blocks       |
//| Mirror of python/xqai/structure.py                               |
//+------------------------------------------------------------------+
#ifndef XQAI_STRUCTURE_MQH
#define XQAI_STRUCTURE_MQH

#include "Defines.mqh"

#define XQ_FVG_MAX_AGE  100
#define XQ_OB_MAX_AGE   150
#define XQ_OB_LOOKBACK  10
#define XQ_FVG_MIN_ATR  0.1
#define XQ_BOS          1
#define XQ_CHOCH        2

struct XQStructState
  {
   double            shLast, shPrev, slLast, slPrev;
   bool              shBroken, slBroken;
   int               trend, bias;
   int               breakDir, breakType, breakIdx;
   int               sweepDir, sweepIdx;
   double            sweepLevel;
   double            fvgBullTop, fvgBullBot; int fvgBullT;
   double            fvgBearTop, fvgBearBot; int fvgBearT;
   double            obBullTop, obBullBot;   int obBullT;
   double            obBearTop, obBearBot;   int obBearT;
  };

void XQ_StructReset(XQStructState &s)
  {
   s.shLast = XQAI_NONE; s.shPrev = XQAI_NONE; s.slLast = XQAI_NONE; s.slPrev = XQAI_NONE;
   s.shBroken = false; s.slBroken = false;
   s.trend = 0; s.bias = 0;
   s.breakDir = 0; s.breakType = 0; s.breakIdx = -1;
   s.sweepDir = 0; s.sweepIdx = -1; s.sweepLevel = XQAI_NONE;
   s.fvgBullTop = XQAI_NONE; s.fvgBullBot = XQAI_NONE; s.fvgBullT = -1;
   s.fvgBearTop = XQAI_NONE; s.fvgBearBot = XQAI_NONE; s.fvgBearT = -1;
   s.obBullTop = XQAI_NONE;  s.obBullBot = XQAI_NONE;  s.obBullT = -1;
   s.obBearTop = XQAI_NONE;  s.obBearBot = XQAI_NONE;  s.obBearT = -1;
  }

//--- runs the state machine over bars [0, n) and leaves the state of bar n-1 in s
void XQ_ComputeStructure(const double &o[], const double &h[], const double &l[], const double &c[],
                         const double &atr[], const int n, const int k, XQStructState &s)
  {
   XQ_StructReset(s);
   for(int i = 0; i < n; i++)
     {
      //--- 1. swing confirmation (extreme at j = i - k)
      int j = i - k;
      if(j >= k)
        {
         bool isSh = true, isSl = true;
         for(int m = 1; m <= k; m++)
           {
            if(!(h[j] > h[j - m] && h[j] >= h[j + m]))
               isSh = false;
            if(!(l[j] < l[j - m] && l[j] <= l[j + m]))
               isSl = false;
           }
         if(isSh)
           { s.shPrev = s.shLast; s.shLast = h[j]; s.shBroken = false; }
         if(isSl)
           { s.slPrev = s.slLast; s.slLast = l[j]; s.slBroken = false; }
        }
      //--- 2. HH/HL vs LH/LL
      s.trend = 0;
      if(s.shPrev != XQAI_NONE && s.slPrev != XQAI_NONE)
        {
         if(s.shLast > s.shPrev && s.slLast > s.slPrev)
            s.trend = 1;
         else
            if(s.shLast < s.shPrev && s.slLast < s.slPrev)
               s.trend = -1;
        }
      //--- 3. zone invalidation / expiry
      if(s.fvgBullT >= 0 && (l[i] <= s.fvgBullBot || i - s.fvgBullT > XQ_FVG_MAX_AGE))
        { s.fvgBullTop = XQAI_NONE; s.fvgBullBot = XQAI_NONE; s.fvgBullT = -1; }
      if(s.fvgBearT >= 0 && (h[i] >= s.fvgBearTop || i - s.fvgBearT > XQ_FVG_MAX_AGE))
        { s.fvgBearTop = XQAI_NONE; s.fvgBearBot = XQAI_NONE; s.fvgBearT = -1; }
      if(s.obBullT >= 0 && (c[i] < s.obBullBot || i - s.obBullT > XQ_OB_MAX_AGE))
        { s.obBullTop = XQAI_NONE; s.obBullBot = XQAI_NONE; s.obBullT = -1; }
      if(s.obBearT >= 0 && (c[i] > s.obBearTop || i - s.obBearT > XQ_OB_MAX_AGE))
        { s.obBearTop = XQAI_NONE; s.obBearBot = XQAI_NONE; s.obBearT = -1; }
      //--- 4. BOS / CHOCH and the order block of the impulse
      if(s.shLast != XQAI_NONE && !s.shBroken && c[i] > s.shLast)
        {
         s.breakType = (s.bias < 0) ? XQ_CHOCH : XQ_BOS;
         s.breakDir = 1; s.breakIdx = i; s.bias = 1; s.shBroken = true;
         for(int jj = i - 1; jj > i - 1 - XQ_OB_LOOKBACK && jj >= 0; jj--)
            if(c[jj] < o[jj])
              { s.obBullTop = h[jj]; s.obBullBot = l[jj]; s.obBullT = i; break; }
        }
      else
         if(s.slLast != XQAI_NONE && !s.slBroken && c[i] < s.slLast)
           {
            s.breakType = (s.bias > 0) ? XQ_CHOCH : XQ_BOS;
            s.breakDir = -1; s.breakIdx = i; s.bias = -1; s.slBroken = true;
            for(int jj = i - 1; jj > i - 1 - XQ_OB_LOOKBACK && jj >= 0; jj--)
               if(c[jj] > o[jj])
                 { s.obBearTop = h[jj]; s.obBearBot = l[jj]; s.obBearT = i; break; }
           }
      //--- 5. liquidity sweeps
      if(s.shLast != XQAI_NONE && !s.shBroken && h[i] > s.shLast && c[i] <= s.shLast)
        { s.sweepDir = -1; s.sweepIdx = i; s.sweepLevel = s.shLast; }
      else
         if(s.slLast != XQAI_NONE && !s.slBroken && l[i] < s.slLast && c[i] >= s.slLast)
           { s.sweepDir = 1; s.sweepIdx = i; s.sweepLevel = s.slLast; }
      //--- 6. fair value gaps
      if(i >= 2 && atr[i] > 0)
        {
         if(l[i] > h[i - 2] && l[i] - h[i - 2] >= XQ_FVG_MIN_ATR * atr[i])
           { s.fvgBullTop = l[i]; s.fvgBullBot = h[i - 2]; s.fvgBullT = i; }
         if(h[i] < l[i - 2] && l[i - 2] - h[i] >= XQ_FVG_MIN_ATR * atr[i])
           { s.fvgBearTop = l[i - 2]; s.fvgBearBot = h[i]; s.fvgBearT = i; }
        }
     }
  }

#endif
