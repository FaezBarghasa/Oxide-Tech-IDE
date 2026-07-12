use std::path::Path;
use git2::{Repository, Signature, Oid, Commit};
use anyhow::Result;

pub trait CheckpointManager {
    fn save_checkpoint(&self, worktree_path: &Path, name: &str) -> Result<Oid, String>;
    fn restore_checkpoint(&self, worktree_path: &Path, commit_id: Oid) -> Result<(), String>;
}

pub struct GitCheckpointManager;

impl CheckpointManager for GitCheckpointManager {
    fn save_checkpoint(&self, worktree_path: &Path, name: &str) -> Result<Oid, String> {
        let repo = Repository::open(worktree_path).map_err(|e| e.to_string())?;
        let mut index = repo.index().map_err(|e| e.to_string())?;
        index.add_all(["."].iter(), git2::IndexAddOption::DEFAULT, None).map_err(|e| e.to_string())?;
        index.write().map_err(|e| e.to_string())?;

        let tree_id = index.write_tree().map_err(|e| e.to_string())?;
        let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;

        let signature = Signature::now("AEOS", "aeos@oxide.tech").map_err(|e| e.to_string())?;

        let parent_commit = find_last_commit(&repo)?;

        repo.commit(
            Some("HEAD"),
            &signature,
            &signature,
            name,
            &tree,
            &[&parent_commit],
        ).map_err(|e| e.to_string())
    }

    fn restore_checkpoint(&self, worktree_path: &Path, commit_id: Oid) -> Result<(), String> {
        let repo = Repository::open(worktree_path).map_err(|e| e.to_string())?;
        let commit = repo.find_commit(commit_id).map_err(|e| e.to_string())?;
        repo.reset(commit.as_object(), git2::ResetType::Hard, None).map_err(|e| e.to_string())
    }
}

fn find_last_commit(repo: &Repository) -> Result<Commit, String> {
    let obj = repo.head().map_err(|e| e.to_string())?.peel(git2::ObjectType::Commit).map_err(|e| e.to_string())?;
    obj.into_commit().map_err(|_| "Couldn't find commit".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;

    fn setup_repo() -> Result<tempfile::TempDir> {
        let dir = tempdir()?;
        let repo = Repository::init(dir.path())?;
        let mut file = File::create(dir.path().join("file.txt"))?;
        writeln!(file, "initial content")?;

        let mut index = repo.index()?;
        index.add_path(Path::new("file.txt"))?;
        let tree_id = index.write_tree()?;
        let tree = repo.find_tree(tree_id)?;

        let signature = Signature::now("test", "test@test.com")?;
        repo.commit(Some("HEAD"), &signature, &signature, "initial commit", &tree, &[])?;

        Ok(dir)
    }

    #[test]
    fn test_save_and_restore_checkpoint() -> Result<()> {
        let dir = setup_repo()?;
        let manager = GitCheckpointManager;

        let mut file = File::create(dir.path().join("file.txt"))?;
        writeln!(file, "new content")?;

        let commit_id = manager.save_checkpoint(dir.path(), "checkpoint 1")?;

        let mut file = File::create(dir.path().join("file.txt"))?;
        writeln!(file, "another content")?;

        manager.restore_checkpoint(dir.path(), commit_id)?;

        let content = std::fs::read_to_string(dir.path().join("file.txt"))?;
        assert_eq!(content.trim(), "new content");

        Ok(())
    }
}
