# Ajan Mimarisi: ReAct, MRKL ve Kendi Kendini Düzeltme

<!-- toc -->

<br/>
<br/>

Statik dil modeli çıkarımından otonom sistemlere geçiş sürecinde, ajanın **mimarisi**; problemleri ne kadar etkili ayrıştırdığını, eylemleri nasıl seçtiğini, çevresel geri bildirimleri nasıl yorumladığını ve çalışma zamanı hatalarını nasıl telafi ettiğini belirler. Deterministik olmayan API yanıtları, şema uyumsuzlukları veya çok adımlı mantıksal zincirlerle karşılaşıldığında basit prompting yöntemleri hızla çöker.

Bu bölümde, üretim seviyesindeki (*production-grade*) otonom sistemleri güçlendiren üç temel mimari deseni inceliyoruz: **ReAct** (*Reason + Act*), **MRKL** (*Modular Reasoning, Knowledge, and Language*) ve **Kendi Kendini Düzeltme / Reflexion** geri bildirim döngüleri. Bu desenlerin matematiksel modellerini, yürütme akış şemalarını, hata kurtarma mekanizmalarını ve dinamik şema onarımı içeren temsili ve özlü Python uygulamasını ele alıyoruz.

<br/>
<br/>

---

## 1. Ajan Akıl Yürütmesinin Evrimi

Yapılandırılmış mimariler geliştirilmeden önce, LLM orkestrasyonu iki uç paradigmaya dayanıyordu: yalnızca bilişsel akıl yürütme (*Chain-of-Thought*) veya doğrudan fonksiyonel araç çalıştırma (*Action-only*). Dinamik ortamlarda her iki yaklaşım da yapısal kırılganlıklara sahiptir.

<br/>

```mermaid
flowchart TD
    subgraph CoT["Chain-of-Thought (Sadece Düşünce)"]
        C1["Girdi İstemi (Prompt)"] --> C2["Dahili Akıl Yürütme (Thought 1...N)"]
        C2 --> C3["Statik Çıktı"]
        C3 -.->|Gerçek Zamanlı Veriye Kapalı| C4["Halüsinasyon Riski"]
    end

    subgraph ActOnly["Action-Only (Doğrudan Araç Çağrısı)"]
        A1["Girdi İstemi (Prompt)"] --> A2["Araç Çağrısı (Action 1...N)"]
        A2 --> A3["Ham Çalışma Çıktısı"]
        A3 -.->|Alt Hedef Takibi Eksik| A4["Hata Kaskadı"]
    end

    subgraph ReAct["ReAct (Düşünce ve Eylem Birlikteliği)"]
        R1["Girdi İstemi (Prompt)"] --> R2["Düşünce t: Akıl Yürüt ve Planla"]
        R2 --> R3["Eylem t: Aracı Çalıştır"]
        R3 --> R4["Gözlem t: Gerçek Dünya Verisi"]
        R4 -->|Geri Bildirim Döngüsü| R2
        R4 --> R5["Nihai Doğrulanmış Sentez"]
    end

    style C1 fill:#1a1a2e,stroke:#e94560,stroke-width:1.5px,color:#fff
    style C2 fill:#1a1a2e,stroke:#e94560,stroke-width:1.5px,color:#fff
    style C3 fill:#1a1a2e,stroke:#e94560,stroke-width:1.5px,color:#fff
    style C4 fill:#1a1a2e,stroke:#e94560,stroke-width:1.5px,color:#fff
    style A1 fill:#1a1a2e,stroke:#f77f00,stroke-width:1.5px,color:#fff
    style A2 fill:#1a1a2e,stroke:#f77f00,stroke-width:1.5px,color:#fff
    style A3 fill:#1a1a2e,stroke:#f77f00,stroke-width:1.5px,color:#fff
    style A4 fill:#1a1a2e,stroke:#f77f00,stroke-width:1.5px,color:#fff
    style R1 fill:#0f3460,stroke:#06d6a0,stroke-width:2px,color:#fff
    style R2 fill:#0f3460,stroke:#06d6a0,stroke-width:2px,color:#fff
    style R3 fill:#0f3460,stroke:#06d6a0,stroke-width:2px,color:#fff
    style R4 fill:#0f3460,stroke:#06d6a0,stroke-width:2px,color:#fff
    style R5 fill:#0f3460,stroke:#06d6a0,stroke-width:2px,color:#fff
```

<br/>

### 1.1 Chain-of-Thought (CoT) ve Action-Only Kırılganlıkları

1. **Chain-of-Thought (Sadece Akıl Yürütme):** Dış dünya ile etkileşime girmeden içsel düşünce adımları üretir. Kapalı sembolik problemlerde başarılı olsa da, canlı durumları sorgulayamaz ve kısıtları doğrulayamaz; bu da **olgusal halüsinasyona** yol açar.
2. **Action-Only (Doğrudan Eylem):** Açık bir akıl yürütme scratchpad'i (karalama alanı) tutmaksızın doğrudan API çağrıları fırlatır. Durum ayrıştırma ve alt hedef takip yeteneği zayıf olduğu için araç çıktıları belirsiz veya hatalı olduğunda çöker.
3. **ReAct Paradigması:** Dilsel akıl yürütme adımlarını (*"Bir sonraki adımda neyi öğrenmem gerekiyor?"*) somut ortam etkileşimleriyle (*"Search(q) fonksiyonunu çağır"*) ardışık olarak birleştirir; gelen gözlemi bir sonraki adımın bilişsel durumunu güncellemek için kullanır.

<br/>
<br/>

---

## 2. ReAct (Reason + Act) Mimarisi

*Yao ve ark. (2022)* tarafından tanıtılan **ReAct**, dil modelinin akıl yürütme gücünü eylem çalıştırma döngüsüyle birleştirir. Akıl yürütme izleri ajanın eylem planlarını takip etmesini ve güncellemesini sağlarken, eylemler ajanın harici bilgi tabanları ve yazılım ortamlarıyla arayüz kurmasına olanak tanır.

<br/>

### 2.1 Matematiksel Formülasyon

Ajanın görevi ayrık zaman adımları $t \in \lbrace 1, 2, \dots, T \rbrace$ üzerinde tanımlansın. Her $t$ adımında ajan o ana kadarki çalışma geçmişini alır:

$$
H_t = \left( q, t_1, a_1, o_1, t_2, a_2, o_2, \dots, t_{t-1}, a_{t-1}, o_{t-1} \right)
$$

Burada:
* $q$: Kullanıcı hedefi / başlangıç sorgusu.
* $t_i \in \mathcal{T}$: Düşünce uzayından üretilen akıl yürütme veya alt plan izi.
* $a_i \in \mathcal{A}$: Araç eylem uzayından $\mathcal{A} = \mathcal{A}_{\text{tools}} \cup \lbrace \text{finish} \rbrace$ seçilen somut eylem.
* $o_i \in \mathcal{O}$: Eylem $a_i$ çalıştırıldıktan sonra ortamın döndürdüğü gözlem çıktısı.

<br/>

Ajanın politikası $\pi_\theta$, geçmişe $H_t$ koşullu olarak akıl yürütme ve eylem seçimini ardışık yürütür:

$$
t_t \sim \pi_\theta(\cdot \mid H_t)
$$

$$
a_t \sim \pi_\theta(\cdot \mid H_t, t_t)
$$

$$
o_t = \mathcal{E}(a_t)
$$

$$
H_{t+1} = H_t \circ (t_t, a_t, o_t)
$$

Döngü $a_t = \text{finish}(y)$ durumuna ulaştığında sonlanır; burada $y$, tüm gözlem yörüngesine $\mathcal{O}_{1:t}$ dayanan nihai sentezlenmiş cevaptır.

<br/>

### 2.2 ReAct Yürütme Döngüsü Akış Şeması

<br/>

```mermaid
flowchart TD
    Start["Kullanıcı Hedefi / Sorgusu (q)"] --> Reason["1. Düşünce Üretimi (Think)<br/>H_t Geçmişini İncele ve Sonraki Alt Hedefi Planla"]
    Reason --> CheckAction{"Araç Çağrısı Gerekli mi?"}
    
    CheckAction -->|Evet: Araç Çağrısı| Act["2. Eylem Çalıştırma (Act)<br/>Şemayı Doğrula ve a_t Aracını Çalıştır"]
    CheckAction -->|Hayır: Görev Tamamlandı| Terminate["3. Doğrulanmış Sentez<br/>Nihai Yanıtı Oluştur (y)"]
    
    Act --> Observe["4. Gözlem İşleme (Observe)<br/>Çıktıyı Temizle ve o_t Sonucunu Yakala"]
    Observe -->|Gecmise Ekle| Reason
    
    Terminate --> Done["Nihai Çıktı"]

    style Start fill:#16213e,stroke:#4cc9f0,stroke-width:2px,color:#fff
    style Reason fill:#0f3460,stroke:#4cc9f0,stroke-width:2px,color:#fff
    style CheckAction fill:#1a1a2e,stroke:#ffd166,stroke-width:1.5px,color:#fff
    style Act fill:#0f3460,stroke:#e94560,stroke-width:2px,color:#fff
    style Observe fill:#1a1a2e,stroke:#f77f00,stroke-width:2px,color:#fff
    style Terminate fill:#1a1a2e,stroke:#06d6a0,stroke-width:2px,color:#fff
    style Done fill:#16213e,stroke:#06d6a0,stroke-width:2px,color:#fff
```

<br/>

> **Kritik İçgörü:** $t_t$ düşünce adımları dış ortamı doğrudan değiştirmez; modelin çalışma belleğidir (*scratchpad*). Bu ara adımlar, sonraki eylemin arama uzayını daraltır ve eylem seçimindeki hatayı minimize eder.

<br/>
<br/>

---

## 3. MRKL (Modular Reasoning, Knowledge, and Language) Mimarisi

*AI21 Labs (Karpas ve ark.)* tarafından önerilen **MRKL**, nöro-sembolik bir mimaridir. Temel varsayımı şudur: Büyük dil modelleri aritmetik hesaplama, SQL sorgusu veya katı kural tabanlı mantık işletimini dahili ağırlıklarıyla yapmamalıdır; bunun yerine LLM, görevleri özelleşmiş sembolik uzman modüllere yönlendiren **merkezi bir bilişsel yönlendirici (router)** olarak çalışmalıdır.

<br/>

```mermaid
flowchart TD
    User["Kullanıcı İsteği"] --> Router["MRKL Nöral Yönlendirici (LLM)<br/>Niyet Sınıflandırma ve Semantik Routing"]
    
    Router -->|Matematik İfadesi| ModMath["Sembolik Hesaplayıcı<br/>Python AST / SymPy / Calculator"]
    Router -->|Tablosal Veri Sorgusu| ModSQL["Veritabanı Motoru<br/>SQL Oluşturucu + Doğrulayıcı"]
    Router -->|Bilgi Erişimi| ModRAG["Bilgi Erişimi ve RAG<br/>Dense Vector Search + BM25"]
    Router -->|Dış Sistem Entegrasyonu| ModAPI["Harici REST API'ler<br/>ERP / Ödeme / Kimlik Servisleri"]

    ModMath --> Aggregator["MRKL Yanıt Birleştirici<br/>Yapılandırılmış veriyi doğal dile sentezleme"]
    ModSQL --> Aggregator
    ModRAG --> Aggregator
    ModAPI --> Aggregator

    Aggregator --> Out["Deterministik ve Güvenilir Çıktı"]

    style User fill:#16213e,stroke:#4cc9f0,stroke-width:2px,color:#fff
    style Router fill:#0f3460,stroke:#4cc9f0,stroke-width:2px,color:#fff
    style ModMath fill:#16213e,stroke:#f77f00,stroke-width:1.5px,color:#fff
    style ModSQL fill:#16213e,stroke:#06d6a0,stroke-width:1.5px,color:#fff
    style ModRAG fill:#16213e,stroke:#e94560,stroke-width:1.5px,color:#fff
    style ModAPI fill:#16213e,stroke:#ffd166,stroke-width:1.5px,color:#fff
    style Aggregator fill:#1a1a2e,stroke:#4cc9f0,stroke-width:2px,color:#fff
    style Out fill:#16213e,stroke:#06d6a0,stroke-width:2px,color:#fff
```

<br/>

### 3.1 MRKL vs. ReAct: Mimari Karşılaştırma

| Boyut / Kriter | ReAct Mimarisi | MRKL Mimarisi |
| :--- | :--- | :--- |
| **Temel Felsefe** | Dinamik, açık uçlu akıl yürütme ve yinelemeli keşif | Özelleşmiş deterministik uzman modüllere nöro-sembolik delegasyon |
| **Yönlendirme Deseni** | Otonom döngü: Model her $t$ adımında sonraki aracı dinamik seçer | Hiyerarşik yönlendirici: Router doğrudan hedef uzman modülü seçer |
| **Hata Yönetimi** | Gözlem geri bildirimiyle dinamik yeniden istem (re-prompting) | Modül bazlı kural kontrolleri ve açık şema doğrulama mekanizmaları |
| **En Uygun Senaryo** | Derin araştırma, serbest hata ayıklama, çok adımlı web aramaları | Kurumsal ERP/CRM, SQL analitiği, kesin finansal hesaplamalar |

<br/>
<br/>

---

## 4. Kendi Kendini Düzeltme (Self-Correction) ve Reflexion Mekanizmaları

Üretim ortamındaki otonom ajanlar; runtime istisnaları, JSON parse hataları ve şema ihlalleri ile karşılaşırlar. **Self-Correction (Kendi Kendini Düzeltme)**, ajanın karşılaştığı hatayı çalışma ortamını çökertmeden yakalaması, hata nedenini analiz etmesi ve yeni bir denemeyle hatayı telafi etmesidir.

<br/>

### 4.1 Taxonomy of Agent Runtime Failures (Hata Sınıflandırması)

```
                    ┌──────────────────────────────────────────────┐
                    │            Agent Failure Taxonomy            │
                    └──────────────────────┬───────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌───────────────────┐             ┌───────────────────┐             ┌───────────────────┐
│   Syntax & Schema │             │ Environmental &   │             │ Semantic & Logic  │
│   Validation      │             │ System Failures   │             │ Deadlocks         │
├───────────────────┤             ├───────────────────┤             ├───────────────────┤
│ • Invalid JSON    │             │ • Rate limit (429)│             │ • Infinite loop   │
│ • Missing params  │             │ • 500 Server Error│             │ • Hallucinated tool│
│ • Wrong type cast │             │ • Network Timeout │             │ • Contradiction   │
└───────────────────┘             └───────────────────┘             └───────────────────┘
```

<br/>

### 4.2 Reflexion Kapalı Döngü Mimarisi

*Shinn ve ark. (2023)* tarafından tanıtılan **Reflexion**, ajanları dinamik hafıza ve öz-yansıtma yetenekleriyle donatır. Model ağırlıklarını $\theta$ güncellemek yerine, ajan başarısız yörüngesinin dilsel bir eleştirisini $r_t \in \mathcal{R}$ üreterek bunu epizodik belleğe kaydeder.

<br/>

```mermaid
flowchart LR
    Actor["Aktör (Ajan)<br/>Eylem Yörüngesi Üretir"] --> Env["Çalışma Zamanı (Runtime)<br/>Aracı Çalıştırır veya Hata Döndürür"]
    Env --> Evaluator{"Değerlendirici (Kritik)<br/>Çıktıyı ve Kısıtları Doğrular"}
    
    Evaluator -->|Başarılı| Done["Başarılı Çıktı"]
    Evaluator -->|Hata Algılandı| Reflector["Öz-Yansıtma Motoru<br/>r_t Hata Eleştirisi Üretir"]
    
    Reflector --> Mem["Epizodik Çalışma Belleği<br/>Hataları ve Geri Bildirimi Saklar"]
    Mem -->|Önceki Hataları Kural Olarak Enjekte Et| Actor

    style Actor fill:#0f3460,stroke:#4cc9f0,stroke-width:2px,color:#fff
    style Evaluator fill:#16213e,stroke:#ffd166,stroke-width:2px,color:#fff
    style Reflector fill:#1a1a2e,stroke:#e94560,stroke-width:2px,color:#fff
    style Mem fill:#16213e,stroke:#06d6a0,stroke-width:1.5px,color:#fff
    style Done fill:#16213e,stroke:#06d6a0,stroke-width:2px,color:#fff
```

<br/>

### 4.3 Algoritmik Hata Kurtarma Formülasyonu

Bir araç çalıştırması $a_t = (m, p)$ başarısız olduğunda:

1. **İstisna Yakalama (Catch & Guard):** Ajan runtime'ı $e_t$ hatasını yakalar ve çöküşü engeller.
2. **Hata Serileştirme:** Ham hata yığını temizlenip yapılandırılmış bir gözleme dönüştürülür:
   $$
   o_t = \text{HataFormati}(\text{tip}(e_t), \text{mesaj}(e_t), \text{sema}(m))
   $$
3. **Reflexive İstemi:** Gözlem $H_{t+1}$ geçmişine eklenerek modelden hatayı onarması istenir:
   $$
   t_{t+1} \sim \pi_\theta(\cdot \mid H_t, a_t, o_t, \text{ReflexionIstemi})
   $$

<br/>
<br/>

---

## 5. Temsili Uygulama: Kendi Kendini Onaran ReAct Motoru

Aşağıda **ReAct döngüsünü**, **Pydantic şema doğrulamasını** ve **hata yakalama ile kendi kendini düzeltme (self-healing) mekanizmasını** gösteren temiz ve temsili Python kodu yer almaktadır:

<br/>

```python
from typing import Callable, Dict, Any
from pydantic import BaseModel, Field, ValidationError

class Tool(BaseModel):
    name: str
    description: str
    schema_model: type[BaseModel]
    handler: Callable[..., str]

    def execute(self, payload: Dict[str, Any]) -> str:
        # 1. Adım: Katı girdi şema doğrulaması
        validated = self.schema_model(**payload)
        return self.handler(**validated.model_dump())


class ReActRuntime:
    """Devre kesici (circuit breaker) ve hata telafisi içeren yürütme motoru."""
    def __init__(self, tools: Dict[str, Tool], max_iterations: int = 5):
        self.tools = tools
        self.max_iterations = max_iterations

    def run_loop(self, goal: str, llm_step_fn: Callable[[str], str]) -> str:
        scratchpad = f"Goal: {goal}\n"

        for step in range(1, self.max_iterations + 1):
            # 1. LLM'den Düşünce ve Eylem üret
            step_output = llm_step_fn(scratchpad)
            
            if "Final Answer:" in step_output:
                return step_output.split("Final Answer:")[-1].strip()

            # 2. Araç adı ve parametreleri ayrıştır
            tool_name, params = self._parse_action(step_output)

            # 3. Kendi Kendini Düzeltme (Self-Correction) Geri Bildirimiyle Güvenli Çalıştırma
            if tool_name not in self.tools:
                obs = f"Observation: Error: Tool '{tool_name}' bulunamadı. Mevcut: {list(self.tools.keys())}"
            else:
                try:
                    res = self.tools[tool_name].execute(params)
                    obs = f"Observation: {res}"
                except ValidationError as ve:
                    obs = f"Observation: SchemaValidationError: {ve.errors()}"
                except Exception as e:
                    obs = f"Observation: ExecutionError: {type(e).__name__}: {str(e)}"

            # 4. Sonraki adım için karalama defterine (scratchpad) geri bildirim ekle
            scratchpad += f"{step_output}\n{obs}\n"

        raise RuntimeError("CircuitBreaker: Maksimum adım sınırı aşıldı.")

    def _parse_action(self, text: str) -> tuple[str, Dict[str, Any]]:
        # Araç adını ve JSON argümanlarını çıkaran temsili ayrıştırıcı
        ...
```

<br/>
<br/>

---

## 6. Mimari Karşılaştırma ve Üretim Kriterleri

<br/>

| Mimari | Güçlü Yönleri | Zayıflıkları / Limitleri | En Uygun Üretim Senaryosu |
| :--- | :--- | :--- | :--- |
| **ReAct** | Yüksek uyarlanabilirlik; şeffaf düşünce izi; sürekli gerçek dünya verisiyle doğrulama. | Yüksek token tüketimi; devre kesici (circuit breaker) yoksa sonsuz döngü riski. | Canlı araştırma asistanları, hata ayıklama botları, web gezginleri. |
| **MRKL** | Deterministik güvenilirlik; katı şema uyumu; hesaplamayı harici motorlara devretme. | Yeni/öngörülmemiş senaryolara daha az esnek; her uzman araç için ayrı mühendislik gerektirir. | Kurumsal ERP/CRM analitiği, SQL sorgulama sistemleri, finansal hesaplayıcılar. |
| **Plan-and-Solve** | Görevi baştan DAG alt görevlerine böler; paralel araç çalıştırmayı mümkün kılar. | Ara adımlardan biri başarısız olduğunda dinamik yeniden planlama yapılmazsa kırılgandır. | Toplu veri işleme (ETL), statik kod üretim ardışık düzenleri. |
| **Reflexion** | Başarısızlıklardan epizodik hafıza ile ders çıkarır; insan müdahalesi olmadan kendini onarır. | Çıkarım maliyetini ve gecikmeyi artırır; güçlü bir değerlendirici (critic) sinyali gerektirir. | Otomatik test onarımı, kod üretimi, kendi kendini iyileştiren scraper'lar. |

<br/>
<br/>

---

## 7. Özet Çıkarımlar

1. **ReAct bilişsel planlama ile ortam durumunu birleştirir:** $t_t$ (düşünceler) ve $a_t$ (eylemler) arasındaki döngü, hem CoT'un kör halüsinasyonlarını hem de Action-only modellerin kör yürütme hatalarını engeller.
2. **Deterministik görevler sembolik modüllere aittir:** MRKL felsefesi uyarınca dil modelleri aritmetik yapmamalı veya SQL sorgularını akıldan çalıştırmamalı; akıllı bir yönlendirici (router) olarak çalışmalıdır.
3. **Kendi kendini düzeltme yapılandırılmış geri bildirim gerektirir:** İstisnaları yakalayıp şema ipuçlarıyla birlikte modelin gözlem geçmişine eklemek, çalışma zamanı çökmelerini kendi kendini onaran sistemlere dönüştürür.
