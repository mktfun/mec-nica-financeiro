import os
import json
import sys
import glob

def merge_memory(round_dir, memory_file="shared_memory.json"):
    # Carrega ou cria memória base
    if os.path.exists(memory_file):
        with open(memory_file, 'r', encoding='utf-8') as f:
            memory = json.load(f)
    else:
        memory = {"topic": "TBD", "rounds": []}

    round_number = len(memory["rounds"]) + 1
    round_data = {"round": round_number, "messages": []}

    # Lê todos os arquivos MD gerados pelos agentes na pasta do round atual
    if os.path.exists(round_dir):
        files = glob.glob(os.path.join(round_dir, "*.md"))
        for file in files:
            agent_name = os.path.basename(file).split('_')[0]
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read()
            round_data["messages"].append({
                "agent": agent_name,
                "content": content
            })

    memory["rounds"].append(round_data)

    with open(memory_file, 'w', encoding='utf-8') as f:
        json.dump(memory, f, indent=2, ensure_ascii=False)

    print(f"Memory merged successfully for Round {round_number} from {round_dir}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python merge_memory.py <pasta_do_round_atual> [caminho_memory_json]")
        sys.exit(1)
    
    round_dir = sys.argv[1]
    mem_file = sys.argv[2] if len(sys.argv) > 2 else ".council/shared_memory.json"
    
    # Cria pasta .council se não existir
    os.makedirs(os.path.dirname(mem_file), exist_ok=True)
    
    merge_memory(round_dir, mem_file)
