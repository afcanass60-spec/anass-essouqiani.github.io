//+------------------------------------------------------------------+
//| AIModel.mqh - native evaluation of the exported network          |
//| File format written by python/xqai/ml/models.py::export_native  |
//|   XQAI_MODEL,spec,n_features,n_layers,threshold                  |
//|   mean[nf] / scale[nf]                                           |
//|   per layer: in,out,act / weights[in*out] (row major) / bias[out]|
//| act: 0 identity, 1 relu, 2 logistic, 3 tanh                      |
//+------------------------------------------------------------------+
#ifndef XQAI_AIMODEL_MQH
#define XQAI_AIMODEL_MQH

#include "Defines.mqh"

#define XQ_MAX_LAYERS 8

class CNativeModel
  {
private:
   bool              m_loaded;
   int               m_nf, m_nl;
   double            m_threshold;
   double            m_mean[], m_scale[];
   int               m_in[XQ_MAX_LAYERS], m_out[XQ_MAX_LAYERS], m_act[XQ_MAX_LAYERS];
   int               m_woff[XQ_MAX_LAYERS], m_boff[XQ_MAX_LAYERS];
   double            m_w[], m_b[];
   string            m_error, m_file;

   bool              ReadN(const int h, double &dst[], const int count)
     {
      ArrayResize(dst, count);
      for(int k = 0; k < count; k++)
        {
         if(FileIsEnding(h))
            return false;
         dst[k] = FileReadNumber(h);
        }
      return true;
     }

public:
                     CNativeModel(void) : m_loaded(false), m_nf(0), m_nl(0), m_threshold(0.55) {}

   bool              Loaded(void)    const { return m_loaded; }
   double            Threshold(void) const { return m_threshold; }
   string            Error(void)     const { return m_error; }
   string            File(void)      const { return m_file; }

   bool              Load(const string file, const bool common)
     {
      m_loaded = false;
      m_file = file;
      int flags = FILE_READ | FILE_CSV | FILE_ANSI | FILE_SHARE_READ;
      if(common)
         flags |= FILE_COMMON;
      int h = FileOpen(file, flags, ',');
      if(h == INVALID_HANDLE)
        {
         m_error = StringFormat("cannot open model %s (err %d)", file, GetLastError());
         return false;
        }
      string magic = FileReadString(h);
      if(magic != "XQAI_MODEL")
        {
         m_error = "bad model header";
         FileClose(h);
         return false;
        }
      int spec = (int)FileReadNumber(h);
      m_nf = (int)FileReadNumber(h);
      m_nl = (int)FileReadNumber(h);
      m_threshold = FileReadNumber(h);
      if(spec != XQAI_FEATURE_SPEC || m_nf != XQAI_N_FEATURES || m_nl < 1 || m_nl > XQ_MAX_LAYERS)
        {
         m_error = StringFormat("incompatible model: spec=%d nf=%d layers=%d", spec, m_nf, m_nl);
         FileClose(h);
         return false;
        }
      if(!ReadN(h, m_mean, m_nf) || !ReadN(h, m_scale, m_nf))
        {
         m_error = "truncated scaler";
         FileClose(h);
         return false;
        }
      ArrayResize(m_w, 0);
      ArrayResize(m_b, 0);
      int prevOut = m_nf;
      for(int L = 0; L < m_nl; L++)
        {
         m_in[L] = (int)FileReadNumber(h);
         m_out[L] = (int)FileReadNumber(h);
         m_act[L] = (int)FileReadNumber(h);
         if(m_in[L] != prevOut || m_out[L] < 1 || m_out[L] > 4096)
           {
            m_error = StringFormat("layer %d shape mismatch", L);
            FileClose(h);
            return false;
           }
         m_woff[L] = ArraySize(m_w);
         m_boff[L] = ArraySize(m_b);
         int nw = m_in[L] * m_out[L];
         ArrayResize(m_w, m_woff[L] + nw);
         ArrayResize(m_b, m_boff[L] + m_out[L]);
         for(int k = 0; k < nw; k++)
            m_w[m_woff[L] + k] = FileReadNumber(h);
         for(int k = 0; k < m_out[L]; k++)
            m_b[m_boff[L] + k] = FileReadNumber(h);
         prevOut = m_out[L];
        }
      FileClose(h);
      if(m_out[m_nl - 1] != 1)
        {
         m_error = "output layer must have one unit";
         return false;
        }
      for(int k = 0; k < m_nf; k++)
         if(!MathIsValidNumber(m_mean[k]) || !MathIsValidNumber(m_scale[k]) || m_scale[k] == 0.0)
           {
            m_error = "invalid scaler values";
            return false;
           }
      m_loaded = true;
      return true;
     }

   //--- probability that the candidate reaches its TP before its SL; -1 on error
   double            Predict(const double &f[])
     {
      if(!m_loaded || ArraySize(f) != m_nf)
         return -1.0;
      double a[], z[];
      ArrayResize(a, m_nf);
      for(int k = 0; k < m_nf; k++)
         a[k] = (f[k] - m_mean[k]) / m_scale[k];
      for(int L = 0; L < m_nl; L++)
        {
         ArrayResize(z, m_out[L]);
         for(int j = 0; j < m_out[L]; j++)
           {
            double s = m_b[m_boff[L] + j];
            for(int k = 0; k < m_in[L]; k++)
               s += a[k] * m_w[m_woff[L] + k * m_out[L] + j];
            if(m_act[L] == 1)
               s = MathMax(0.0, s);
            else
               if(m_act[L] == 2)
                  s = 1.0 / (1.0 + MathExp(-s));
               else
                  if(m_act[L] == 3)
                     s = (MathExp(2.0 * s) - 1.0) / (MathExp(2.0 * s) + 1.0);
            z[j] = s;
           }
         ArrayResize(a, m_out[L]);
         ArrayCopy(a, z);
        }
      double p = a[0];
      if(!MathIsValidNumber(p) || p < 0.0 || p > 1.0)
         return -1.0;
      return p;
     }
  };

#endif
