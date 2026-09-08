import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\admin\Downloads\CONCILIAÇÃO 0309.xlsx', data_only=True)
ws_os = wb['OS']

print('=== INSPEÇÃO COMPLETA DA SHEET OS (03/09/2026) ===')

# Let's inspect the columns and blocks
# In previous sheets, stores are arranged either in blocks or side by side
for r in range(1, min(120, ws_os.max_row+1)):
    row = [ws_os.cell(r, c).value for c in range(1, min(20, ws_os.max_column+1))]
    non_empty = [(c, val) for c, val in enumerate(row, 1) if val is not None]
    if non_empty:
        # Check if line contains store names or OS
        txt = ' | '.join([f'C{c}:{val}' for c, val in non_empty[:8]])
        print(f'R{r}: {txt}')
