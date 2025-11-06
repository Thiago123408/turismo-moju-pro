from flask import Flask, request, jsonify
import pandas as pd

app = Flask(__name__)

# Exemplo simples: analisar mensagem do contato e sugerir um mini-roteiro
@app.post("/sugerir")
def sugerir():
    try:
        body = request.get_json(force=True) or {}
        nome = body.get("nome","Visitante")
        msg = (body.get("mensagem") or "").lower()

        roteiro = ["Rio Moju", "Praça da Matriz", "Trilha do Bosque Encantado"]
        dicas = []

        if "família" in msg or "crianca" in msg or "criança" in msg:
            dicas.append("Pela manhã: passeio leve na Praça da Matriz.")
            dicas.append("Tarde: orla do Rio Moju com lanche regional.")
        if "aventura" in msg or "trilha" in msg:
            dicas.append("Manhã: Trilha do Bosque (nível moderado).")
            dicas.append("Levar água, protetor e calçado adequado.")
        if not dicas:
            dicas.append("Manhã: Praça da Matriz • Tarde: passeio às margens do Rio Moju.")

        return jsonify({
            "ok": True,
            "visitante": nome,
            "sugestao": {
                "roteiro": roteiro,
                "dicas": dicas
            }
        })
    except Exception as e:
        return jsonify({"ok": False, "erro": str(e)}), 400

# Importar CSV com novos pontos (colunas: nome,descricao,lat,lng,imagem,categoria,bairro)
@app.post("/importar_csv")
def importar_csv():
    try:
        if 'file' not in request.files:
            return jsonify({"ok": False, "erro":"file ausente"}), 400
        f = request.files['file']
        df = pd.read_csv(f)
        # validação básica
        obrig = {"nome","descricao"}
        if not obrig.issubset(set(df.columns.str.lower())):
            return jsonify({"ok":False,"erro":"CSV precisa de colunas: nome, descricao, (lat, lng, imagem, categoria, bairro) opcionais"}), 400

        # aqui tu pode salvar no JSON do Node (escrever arquivo ou expor endpoint)
        # como exemplo simples, retornamos a pré-visualização:
        preview = df.head(10).to_dict(orient="records")
        return jsonify({"ok": True, "preview": preview})
    except Exception as e:
        return jsonify({"ok": False, "erro": str(e)}), 400

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)
