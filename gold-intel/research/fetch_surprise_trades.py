import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from research.data.pm_trades import trades
S=pd.read_parquet('data/surprises_strict.parquet')
jobs={r.mid:r.tstar-pd.Timedelta(days=30) for r in S.itertuples()}
with ThreadPoolExecutor(max_workers=4) as ex:
    futs={ex.submit(trades,m,s):m for m,s in jobs.items()}
    for i,f in enumerate(as_completed(futs)):
        m=futs[f]
        try: d=f.result(); print(f'[{i+1}/{len(jobs)}] {m} {len(d)} trades', flush=True)
        except Exception as e: print(f'[{i+1}/{len(jobs)}] {m} ERREUR {e}', flush=True)
print('Terminé')
