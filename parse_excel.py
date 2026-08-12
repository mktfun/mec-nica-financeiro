import pandas as pd
import json
import sys

file_path = r"C:\Users\User\Downloads\CONCILIAÇÃO 1008.xlsx"

try:
    xl = pd.ExcelFile(file_path)
    res = {}
    for sheet_name in xl.sheet_names:
        df = xl.parse(sheet_name)
        res[sheet_name] = df.head(50).to_json(orient="records")
    
    with open("C:/Users/User/.gemini/antigravity/repos/mec-nica-financeiro/scratch_excel.json", "w") as f:
        json.dump(res, f)
    print("Success")
except Exception as e:
    print(f"Error: {e}")
