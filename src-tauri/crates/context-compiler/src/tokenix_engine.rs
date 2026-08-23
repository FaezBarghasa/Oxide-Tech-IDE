
use candle_core::{Device, Tensor, D};
use candle_transformers::models::bert::{BertModel, Config, DTYPE};
use hf_hub::{api::sync::Api, Repo, RepoType};
use tokenizers::Tokenizer;
use tokio::sync::mpsc;
use crate::errors::{OxideError, OxideResult};

pub struct TokenixEngine {
    model: BertModel,
    tokenizer: Tokenizer,
    device: Device,
}

impl TokenixEngine {
    pub async fn init(use_cuda: bool) -> OxideResult<Self> {
        let device = if use_cuda {
            Device::new_cuda(0).unwrap_or(Device::Cpu)
        } else {
            Device::Cpu
        };

        let api = Api::new().map_err(|e| OxideError::CudaError { message: format!("Failed to create hf_hub api: {}", e) })?;
        let repo = api.repo(Repo::new("BAAI/bge-small-en-v1.5".to_string(), RepoType::Model));

        let config_filename = repo.get("config.json").map_err(|e| OxideError::CudaError { message: format!("Failed to get config.json: {}", e) })?;
        let tokenizer_filename = repo.get("tokenizer.json").map_err(|e| OxideError::CudaError { message: format!("Failed to get tokenizer.json: {}", e) })?;
        let weights_filename = repo.get("pytorch_model.bin").map_err(|e| OxideError::CudaError { message: format!("Failed to get pytorch_model.bin: {}", e) })?;

        let config = std::fs::read_to_string(config_filename).map_err(|e| OxideError::IoError(e))?;
        let config: Config = serde_json::from_str(&config).map_err(|e| OxideError::CudaError { message: format!("Failed to parse config.json: {}", e) })?;

        let mut tokenizer = Tokenizer::from_file(tokenizer_filename).map_err(|e| OxideError::CudaError { message: format!("Failed to load tokenizer: {}", e) })?;
        // BGE models need this setting.
        if let Some(pp) = tokenizer.get_post_processor_mut() {
            pp.set_cls_token("[CLS]".to_string(), 101);
            pp.set_sep_token("[SEP]".to_string(), 102);
        }

        let vb = candle_nn::VarBuilder::from_pth(&weights_filename, DTYPE, &device)
            .map_err(|e| OxideError::CudaError { message: format!("Failed to create VarBuilder: {}", e) })?;
        let model = BertModel::load(vb, &config)
            .map_err(|e| OxideError::CudaError { message: format!("Failed to load BertModel: {}", e) })?;

        Ok(Self { model, tokenizer, device })
    }

    pub async fn embed_batch(&self, texts: Vec<String>) -> OxideResult<Vec<Vec<f32>>> {
        let tokens = self.tokenizer
            .encode_batch(texts, true)
            .map_err(|e| OxideError::CudaError { message: format!("Failed to encode batch: {}", e) })?;

        let token_ids: Vec<Tensor> = tokens
            .iter()
            .map(|t| {
                let ids = t.get_ids().to_vec();
                Tensor::new(ids.as_slice(), &self.device).unwrap().unsqueeze(0)
            })
            .collect();

        let token_ids = Tensor::cat(&token_ids, 0)
            .map_err(|e| OxideError::CudaError { message: format!("Failed to concatenate tensors: {}", e) })?;
        let token_type_ids = token_ids.zeros_like()
            .map_err(|e| OxideError::CudaError { message: format!("Failed to create token_type_ids: {}", e) })?;

        let embeddings = self.model.forward(&token_ids, &token_type_ids)
            .map_err(|e| OxideError::CudaError { message: format!("Model forward pass failed: {}", e) })?;

        // Apply pooling. For BGE, this is just taking the CLS token.
        let (_n_sentence, n_tokens, _hidden_size) = embeddings.dims3().unwrap();
        let embeddings = embeddings.narrow(D::Minus2, 0, 1)
            .map_err(|e| OxideError::CudaError { message: format!("Failed to narrow embeddings: {}", e) })?;
        let embeddings = embeddings.squeeze(D::Minus2)
            .map_err(|e| OxideError::CudaError { message: format!("Failed to squeeze embeddings: {}", e) })?;


        // Normalize
        let norm = embeddings.sqr().unwrap().sum_keepdim(1).unwrap().sqrt().unwrap();
        let embeddings = embeddings.broadcast_div(&norm)
            .map_err(|e| OxideError::CudaError { message: format!("Failed to normalize embeddings: {}", e) })?;

        let embeddings_vec: Vec<Vec<f32>> = embeddings.to_vec2()
            .map_err(|e| OxideError::CudaError { message: format!("Failed to convert embeddings to vec: {}", e) })?;

        Ok(embeddings_vec)
    }
}
