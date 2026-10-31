//+------------------------------------------------------------------+
//| Indicators.mqh - indicator maths on plain arrays                 |
//| Mirror of python/xqai/indicators.py (same seeds and conventions) |
//| Arrays are chronological: index 0 = oldest, n-1 = last closed.   |
//+------------------------------------------------------------------+
#ifndef XQAI_INDICATORS_MQH
#define XQAI_INDICATORS_MQH

#include "Defines.mqh"

//--- recursive average seeded with the first value: y[i] = y[i-1] + a (x[i] - y[i-1])
void XQ_EmaAlpha(const double &x[], const int n, const double alpha, double &y[])
  {
   ArrayResize(y, n);
   if(n <= 0)
      return;
   y[0] = x[0];
   for(int i = 1; i < n; i++)
      y[i] = y[i - 1] + alpha * (x[i] - y[i - 1]);
  }

void XQ_Ema(const double &x[], const int n, const int period, double &y[])    { XQ_EmaAlpha(x, n, 2.0 / (period + 1.0), y); }
void XQ_Wilder(const double &x[], const int n, const int period, double &y[]) { XQ_EmaAlpha(x, n, 1.0 / period, y); }

//--- simple mean of x[i-p+1 .. i]; XQAI_NONE if not enough data
double XQ_SmaAt(const double &x[], const int i, const int p)
  {
   if(i < p - 1 || i < 0)
      return XQAI_NONE;
   double s = 0.0;
   for(int k = i - p + 1; k <= i; k++)
      s += x[k];
   return s / p;
  }

//--- population standard deviation of x[i-p+1 .. i]
double XQ_StdAt(const double &x[], const int i, const int p)
  {
   double m = XQ_SmaAt(x, i, p);
   if(m == XQAI_NONE)
      return XQAI_NONE;
   double s = 0.0;
   for(int k = i - p + 1; k <= i; k++)
      s += (x[k] - m) * (x[k] - m);
   return MathSqrt(s / p);
  }

double XQ_MaxAt(const double &x[], const int i, const int p)
  {
   if(i < p - 1 || i < 0)
      return XQAI_NONE;
   double m = x[i];
   for(int k = i - p + 1; k <= i; k++)
      m = MathMax(m, x[k]);
   return m;
  }

double XQ_MinAt(const double &x[], const int i, const int p)
  {
   if(i < p - 1 || i < 0)
      return XQAI_NONE;
   double m = x[i];
   for(int k = i - p + 1; k <= i; k++)
      m = MathMin(m, x[k]);
   return m;
  }

void XQ_Rsi(const double &c[], const int n, const int period, double &out[])
  {
   double g[], l[], ag[], al[];
   ArrayResize(g, n);
   ArrayResize(l, n);
   ArrayResize(out, n);
   if(n <= 0)
      return;
   g[0] = 0.0;
   l[0] = 0.0;
   for(int i = 1; i < n; i++)
     {
      double d = c[i] - c[i - 1];
      g[i] = (d > 0) ? d : 0.0;
      l[i] = (d < 0) ? -d : 0.0;
     }
   XQ_Wilder(g, n, period, ag);
   XQ_Wilder(l, n, period, al);
   for(int i = 0; i < n; i++)
     {
      if(al[i] == 0.0)
         out[i] = (ag[i] == 0.0) ? 50.0 : 100.0;
      else
         out[i] = 100.0 - 100.0 / (1.0 + ag[i] / al[i]);
     }
  }

void XQ_TrueRange(const double &h[], const double &l[], const double &c[], const int n, double &tr[])
  {
   ArrayResize(tr, n);
   if(n <= 0)
      return;
   tr[0] = h[0] - l[0];
   for(int i = 1; i < n; i++)
      tr[i] = MathMax(h[i] - l[i], MathMax(MathAbs(h[i] - c[i - 1]), MathAbs(l[i] - c[i - 1])));
  }

void XQ_Atr(const double &h[], const double &l[], const double &c[], const int n, const int period, double &out[])
  {
   double tr[];
   XQ_TrueRange(h, l, c, n, tr);
   XQ_Wilder(tr, n, period, out);
  }

void XQ_Adx(const double &h[], const double &l[], const double &c[], const int n, const int period,
            double &adx[], double &pdi[], double &mdi[])
  {
   double pdm[], mdm[], tr[], sp[], sm[], st[], dx[];
   ArrayResize(pdm, n);
   ArrayResize(mdm, n);
   ArrayResize(dx, n);
   ArrayResize(pdi, n);
   ArrayResize(mdi, n);
   if(n <= 0)
      return;
   pdm[0] = 0.0;
   mdm[0] = 0.0;
   for(int i = 1; i < n; i++)
     {
      double up = h[i] - h[i - 1];
      double dn = l[i - 1] - l[i];
      pdm[i] = (up > dn && up > 0) ? up : 0.0;
      mdm[i] = (dn > up && dn > 0) ? dn : 0.0;
     }
   XQ_TrueRange(h, l, c, n, tr);
   XQ_Wilder(tr, n, period, st);
   XQ_Wilder(pdm, n, period, sp);
   XQ_Wilder(mdm, n, period, sm);
   for(int i = 0; i < n; i++)
     {
      pdi[i] = (st[i] > 0) ? 100.0 * sp[i] / st[i] : 0.0;
      mdi[i] = (st[i] > 0) ? 100.0 * sm[i] / st[i] : 0.0;
      double s = pdi[i] + mdi[i];
      dx[i] = (s > 0) ? 100.0 * MathAbs(pdi[i] - mdi[i]) / s : 0.0;
     }
   XQ_Wilder(dx, n, period, adx);
  }

void XQ_Macd(const double &c[], const int n, double &line[], double &sig[], double &hist[])
  {
   double ef[], es[];
   XQ_Ema(c, n, 12, ef);
   XQ_Ema(c, n, 26, es);
   ArrayResize(line, n);
   ArrayResize(hist, n);
   for(int i = 0; i < n; i++)
      line[i] = ef[i] - es[i];
   XQ_Ema(line, n, 9, sig);
   for(int i = 0; i < n; i++)
      hist[i] = line[i] - sig[i];
  }

#endif
