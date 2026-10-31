//+------------------------------------------------------------------+
//| Defines.mqh - enums, constants and plain structures              |
//| XAUUSD Quantum AI - modular Expert Advisor                       |
//+------------------------------------------------------------------+
#ifndef XQAI_DEFINES_MQH
#define XQAI_DEFINES_MQH

#define XQAI_VERSION        "1.0.0"
#define XQAI_FEATURE_SPEC   1
#define XQAI_N_FEATURES     40
#define XQAI_N_STRATEGIES   6
#define XQAI_N_REGIMES      6
#define XQAI_N_COMPONENTS   7
#define XQAI_NONE           EMPTY_VALUE
#define XQAI_FOLDER         "XQAI\\"

//--- operating modes
enum ENUM_XQ_MODE
  {
   XQ_MODE_BACKTEST = 0,   // BACKTEST (Strategy Tester only)
   XQ_MODE_DEMO     = 1,   // DEMO (refuses to run on a real account)
   XQ_MODE_LIVE     = 2    // LIVE (needs explicit confirmation + account number)
  };

//--- AI modes
enum ENUM_XQ_AI_MODE
  {
   XQ_AI_OFF             = 0, // OFF - rule engine only
   XQ_AI_NATIVE          = 1, // NATIVE - network evaluated inside MQL5
   XQ_AI_BRIDGE          = 2, // BRIDGE - Python service
   XQ_AI_BRIDGE_FALLBACK = 3  // BRIDGE, native model as fallback
  };

//--- what to do when AI is required but unavailable
enum ENUM_XQ_DEGRADED
  {
   XQ_DEGRADED_NO_TRADE    = 0, // no new trade (safest)
   XQ_DEGRADED_RULES_STRICT = 1 // rule engine with a higher minimum score
  };

//--- broker server time zone model (used in the Strategy Tester; live uses the real offset)
enum ENUM_XQ_TZ
  {
   XQ_TZ_EET_US = 0, // GMT+2 / GMT+3 following US DST (most "New York close" brokers)
   XQ_TZ_EET_EU = 1, // GMT+2 / GMT+3 following European DST
   XQ_TZ_FIXED  = 2  // fixed offset (InpServerGMTOffset)
  };

//--- strategies (order identical to python/xqai/config.py STRATEGIES)
enum ENUM_XQ_STRATEGY
  {
   XQ_TREND_PULLBACK = 0,
   XQ_BREAKOUT       = 1,
   XQ_LIQ_SWEEP      = 2,
   XQ_REVERSAL       = 3,
   XQ_MOMENTUM       = 4,
   XQ_MEAN_REVERSION = 5
  };

//--- regimes (order identical to REGIMES)
enum ENUM_XQ_REGIME
  {
   XQ_R_TREND_UP   = 0,
   XQ_R_TREND_DOWN = 1,
   XQ_R_RANGE      = 2,
   XQ_R_SQUEEZE    = 3,
   XQ_R_VOLATILE   = 4,
   XQ_R_TRANSITION = 5
  };

//--- sessions (order identical to timeutils.py)
enum ENUM_XQ_SESSION
  {
   XQ_S_ASIA    = 0,
   XQ_S_LONDON  = 1,
   XQ_S_NEWYORK = 2,
   XQ_S_OVERLAP = 3,
   XQ_S_OFF     = 4
  };

//--- score components
#define XQ_C_STRUCTURE    0
#define XQ_C_TREND        1
#define XQ_C_MOMENTUM     2
#define XQ_C_LIQUIDITY    3
#define XQ_C_VOLATILITY   4
#define XQ_C_PRICEACTION  5
#define XQ_C_MTF          6

//--- one evaluated trade proposal
struct XQCandidate
  {
   bool              valid;
   int               strategy;
   int               dir;          // +1 buy, -1 sell
   double            entryRef;     // close of the signal bar
   double            sl;
   double            tp;
   double            risk;         // price distance
   double            rr;
   double            score;
   double            comp[XQAI_N_COMPONENTS];
   int               regime;
  };

string XQ_StrategyName(const int s)
  {
   switch(s)
     {
      case XQ_TREND_PULLBACK: return "TREND_PULLBACK";
      case XQ_BREAKOUT:       return "BREAKOUT";
      case XQ_LIQ_SWEEP:      return "LIQ_SWEEP";
      case XQ_REVERSAL:       return "REVERSAL";
      case XQ_MOMENTUM:       return "MOMENTUM";
      case XQ_MEAN_REVERSION: return "MEAN_REVERSION";
     }
   return "NONE";
  }

string XQ_StrategyCode(const int s)
  {
   switch(s)
     {
      case XQ_TREND_PULLBACK: return "PB";
      case XQ_BREAKOUT:       return "BO";
      case XQ_LIQ_SWEEP:      return "SW";
      case XQ_REVERSAL:       return "RV";
      case XQ_MOMENTUM:       return "MO";
      case XQ_MEAN_REVERSION: return "MR";
     }
   return "";
  }

string XQ_RegimeName(const int r)
  {
   switch(r)
     {
      case XQ_R_TREND_UP:   return "TREND_UP";
      case XQ_R_TREND_DOWN: return "TREND_DOWN";
      case XQ_R_RANGE:      return "RANGE";
      case XQ_R_SQUEEZE:    return "SQUEEZE";
      case XQ_R_VOLATILE:   return "VOLATILE";
      case XQ_R_TRANSITION: return "TRANSITION";
     }
   return "?";
  }

string XQ_RegimeCode(const int r)
  {
   switch(r)
     {
      case XQ_R_TREND_UP:   return "TU";
      case XQ_R_TREND_DOWN: return "TD";
      case XQ_R_RANGE:      return "RG";
      case XQ_R_SQUEEZE:    return "SQ";
      case XQ_R_VOLATILE:   return "VO";
      case XQ_R_TRANSITION: return "TR";
     }
   return "";
  }

string XQ_SessionName(const int s)
  {
   switch(s)
     {
      case XQ_S_ASIA:    return "ASIA";
      case XQ_S_LONDON:  return "LONDON";
      case XQ_S_NEWYORK: return "NEWYORK";
      case XQ_S_OVERLAP: return "OVERLAP";
     }
   return "OFF";
  }

bool XQ_IsCounterTrend(const int s)
  {
   return (s == XQ_LIQ_SWEEP || s == XQ_REVERSAL || s == XQ_MEAN_REVERSION);
  }

bool XQ_Valid(const double v) { return (v != XQAI_NONE && MathIsValidNumber(v)); }

int XQ_Sign(const double v) { return (v > 0.0) ? 1 : ((v < 0.0) ? -1 : 0); }

double XQ_Clip01(const double v) { if(!MathIsValidNumber(v)) return 0.0; return MathMax(0.0, MathMin(1.0, v)); }

#endif
