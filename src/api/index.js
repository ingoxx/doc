import { get, post, loginPost } from '../utils/http'

// 文档接口
export const create_categories = (params) => post(`/v1/create-category?sign=${localStorage.getItem('sign')}&uid=${localStorage.getItem('uid')}`, params);
export const create_problems = (params) => post(`/v1/create-problem?sign=${localStorage.getItem('sign')}&uid=${localStorage.getItem('uid')}`, params);
export const upload_doc = (params) => post(`/v1/upload-file?sign=${localStorage.getItem('sign')}&uid=${localStorage.getItem('uid')}`, params);
export const del_doc = (params) => post(`/v1/del-file?sign=${localStorage.getItem('sign')}&uid=${localStorage.getItem('uid')}`, params);
export const del_categories = (params) => post(`/v1/del-category?sign=${localStorage.getItem('sign')}&uid=${localStorage.getItem('uid')}`, params);
export const del_problems = (params) => post(`/v1/del-problem?sign=${localStorage.getItem('sign')}&uid=${localStorage.getItem('uid')}`, params);
export const update_problems_categories = (params) => post(`/v1/update-problem-category?sign=${localStorage.getItem('sign')}&uid=${localStorage.getItem('uid')}`, params);
export const update_category_share = (params) => post(`/v1/update-category-share?sign=${localStorage.getItem('sign')}&uid=${localStorage.getItem('uid')}`, params);
export const update_problem_share = (params) => post(`/v1/update-problem-share?sign=${localStorage.getItem('sign')}&uid=${localStorage.getItem('uid')}`, params);
export const login_out = (params) => post(`/v1/loginout?sign=${localStorage.getItem('sign')}&uid=${localStorage.getItem('uid')}`, params);


export const get_categories = (params) => get(`/v1/get-category?sign=${localStorage.getItem('sign')}&uid=${localStorage.getItem('uid')}`, params);
export const get_problems = (params) => get(`/v1/get-problem?sign=${localStorage.getItem('sign')}&uid=${localStorage.getItem('uid')}`, params);
export const get_users = (params) => get(`/v1/get-users?sign=${localStorage.getItem('sign')}&uid=${localStorage.getItem('uid')}`, params);
export const download_file = (params) => get(`/v1/download-file?sign=${localStorage.getItem('sign')}&uid=${localStorage.getItem('uid')}`, params);

// 登录验证接口
export const login_auth = (params) => post('/v1/doc/login', params);
export const register_auth = (params) => post('/v1/doc/register', params);
export const update_password = (params) => post('/v1/doc/change-password', params);