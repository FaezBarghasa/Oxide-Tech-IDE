use git2::{Repository, Signature, Oid};
use std::path::Path;

pub trait CheckpointManager {
    fn save_checkpoint(&self, worktree_path: &Path, name: &str) -> Result<(), String>;
    fn restore_checkpoint(&self, worktree_path: &Path, name: &str) -> Result<(), String>;
}

pub struct GitCheckpointManager;

impl CheckpointManager for GitCheckpointManager {
    fn save_checkpoint(&self, worktree_path: &Path, name: &str) -> Result<(), String> {
        let repo = Repository::open(worktree_path).map_err(|e| e.to_string())?;
        let mut index = repo.index().map_err(|e| e.to_string())?;
        index.add_all(["."].iter(), git2::IndexAddOption::DEFAULT, None).map_err(|e| e.to_string())?;
        index.write().map_err(|e| e.to_string())?;

        let oid = index.write_tree().map_err(|e| e.to_string())?;
        let tree = repo.find_tree(oid).map_err(|e| e.to_string())?;

        let signature = Signature::now("AEOS", "aeos@oxide.tech").map_err(|e| e.to_string())?;

        let parent_commit = self.find_last_commit(&repo)?;

        repo.commit(Some("HEAD"), &signature, &signature, name, &tree, &[&parent_commit]).map_err(|e| e.to_string())?;

        Ok(())
    }

    fn restore_checkpoint(&self, worktree_path: &Path, name: &str) -> Result<(), String> {
        let repo = Repository::open(worktree_path).map_err(|e| e.to_string())?;
        let (object, _) = repo.revparse_ext(name).map_err(|e| e.to_string())?;
        repo.checkout_tree(&object, None).map_err(|e| e.to_string())?;
        Ok(())
    }
}

impl GitCheckpointManager {
    fn find_last_commit<'a>(&self, repo: &'a Repository) -> Result<git2::Commit<'a>, String> {
        let obj = repo.head().map_err(|e| e.to_string())?.resolve().map_err(|e| e.to_string())?.peel(git2::ObjectType::Commit).map_err(|e| e.to_string())?;
        obj.into_commit().map_err(|_| "Couldn't find commit".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;

    fn setup_git_repo(path: &Path) -> Repository {
        let repo = Repository::init(path).unwrap();
        let mut index = repo.index().unwrap();
        let oid = index.write_tree().unwrap();
        let tree = repo.find_tree(oid).unwrap();
        let signature = Signature::now("test", "test@test.com").unwrap();
        repo.commit(Some("HEAD"), &signature, &signature, "initial commit", &tree, &[]).unwrap();
        repo
    }

    #[test]
    fn test_save_and_restore_checkpoint() {
        let dir = tempdir().unwrap();
        let repo = setup_git_repo(dir.path());
        let manager = GitCheckpointManager;

        let mut file = File::create(dir.path().join("test.txt")).unwrap();
        writeln!(file, "hello").unwrap();

        manager.save_checkpoint(dir.path(), "checkpoint1").unwrap();

        let mut file = File::create(dir.path().join("test.txt")).unwrap();
        writeln!(file, "world").unwrap();

        manager.restore_checkpoint(dir.path(), "checkpoint1").unwrap();

        let content = std::fs::read_to_string(dir.path().join("test.txt")).unwrap();
        assert_eq!(content.trim(), "hello");
    }
}
