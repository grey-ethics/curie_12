### BACKEND

python create_db.py

uvicorn main:app --reload
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
python -m uvicorn main:app --host 0.0.0.0 --port 8000

http://localhost:8000/docs


===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== 


### FRONTEND

npm run dev

http://localhost:5173/


===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== 


### SUPER ADMIN

http://localhost:5173/administrator

SUPER_ADMIN_PASSWORD = superadmin@123


SUPER_ADMIN_EMAIL = superadmin@com.com
SUPER_ADMIN_NAME = Super Admin


===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== 


### CODE SCREENSHOT


python .\code_screenshot_backend.py --root . --out-file code_screenshot_backend_output.md --import-schemas --import-models --import-settings --openapi-factory core.app:create_app


python code_screenshot_frontend.py --root . --out-file code_screenshot_frontend_output.md --include-js --include-css


----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- 


### CODE SCRAPER


python .\code_scraper_backend.py --root . --out-file code_scraper_backend_output.md


python code_scraper_frontend.py --root . --out-file code_scraper_frontend_output.md


===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== 



files_to_scrape_unified = {
    "src/api/chat.ts",
    "src/components/Chat/ChatWindow.tsx",
    "src/hooks/useUrlChat.ts",
    "src/pages/admin/AdminUserChatMain.tsx",
    "src/pages/user/UserChatMain.tsx",
    "src/components/Chat/ChatComposer.tsx",
}





# 1) make the single markdown "blueprint" (backend first, then frontend)
python .\code_screenshot_project.py

# 2) scrape the specific files from backend + frontend into one file
python .\code_scraper_project.py
