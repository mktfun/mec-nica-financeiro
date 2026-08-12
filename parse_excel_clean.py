import pandas as pd
import json

file_path = r"C:\Users\User\Downloads\CONCILIAÇÃO 1008.xlsx"

try:
    xl = pd.ExcelFile(file_path)
    res = {}
    for sheet_name in xl.sheet_names:
        df = xl.parse(sheet_name)
        df = df.dropna(how='all', axis=1) # drop completely empty columns
        df = df.dropna(how='all', axis=0) # drop completely empty rows
        # convert datetime to string
        for col in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                df[col] = df[col].astype(str)
        res[sheet_name] = df.head(200).to_dict(orient="records")
    
    # write a simple dump to txt
    with open("C:/Users/User/.gemini/antigravity/repos/mec-nica-financeiro/scratch_excel_clean.txt", "w", encoding='utf-8') as f:
        for k, rows in res.items():
            f.write(f"--- SHEET: {k} ---\n")
            for i, r in enumerate(rows):
                f.write(f"Row {i}:\n")
                for col, val in r.items():
                    if pd.notna(val) and val != "":
                        f.write(f"  {col}: {val}\n")
            f.write("\n")
    print("Success")
except Exception as e:
    print(f"Error: {e}")
