import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, Zap, Activity, Target, Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { supabase } from './supabaseClient'; // 2단계에서 만든 파일 import

const BaseballDashboard = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. [데이터 불러오기] 앱이 켜질 때 DB에서 가져옴
  const fetchPlayers = async () => {
    setLoading(true);
    // players 테이블의 모든(*) 데이터를 가져와라, id 순서대로 정렬해서.
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('id', { ascending: true });

    if (error) console.error('Error fetching:', error);
    else setRawData(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  // 입력 폼 상태
  const [inputForm, setInputForm] = useState({
    name: '', pa: 0, hits: 0, double: 0, triple: 0, homerun: 0, walks: 0, sb: 0, sb_fail: 0
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputForm(prev => ({
      ...prev,
      [name]: name === 'name' ? value : Number(value)
    }));
  };

  // 2. [데이터 추가] DB에 Insert
  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!inputForm.name) return alert('선수 이름을 입력해주세요.');

    // DB에 넣기
    const { error } = await supabase
      .from('players')
      .insert([ inputForm ]); // inputForm의 키값과 DB 컬럼명이 같아야 함

    if (error) {
      alert('저장 실패: ' + error.message);
    } else {
      fetchPlayers(); // 저장 성공하면 목록 다시 불러오기
      setInputForm({ name: '', pa: 0, hits: 0, double: 0, triple: 0, homerun: 0, walks: 0, sb: 0, sb_fail: 0 });
    }
  };

  // 3. [데이터 삭제] DB에서 Delete
  const handleDelete = async (id) => {
    if(window.confirm('정말 삭제하시겠습니까? (복구 불가)')) {
        const { error } = await supabase
          .from('players')
          .delete()
          .eq('id', id); // id가 일치하는 행 삭제

        if (error) alert('삭제 실패');
        else fetchPlayers(); // 삭제 후 목록 갱신
    }
  };

  // -----------------------------------------------------------------------
  // [계산 로직] (기존과 동일, 변수명만 DB 컬럼명에 맞춰 sbFail -> sb_fail 주의)
  // -----------------------------------------------------------------------
  const players = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    const calculated = rawData.map(p => {
      // DB 컬럼명이 snake_case(sb_fail)일 경우를 대비해 매핑 확인
      const sbFailVal = p.sb_fail || 0; 

      const atBats = p.pa - p.walks; 
      const single = p.hits - (p.double + p.triple + p.homerun);
      const totalBases = single + (p.double * 2) + (p.triple * 3) + (p.homerun * 4);
      
      const avg = atBats > 0 ? p.hits / atBats : 0;
      const obp = p.pa > 0 ? (p.hits + p.walks) / p.pa : 0;
      const slg = atBats > 0 ? totalBases / atBats : 0;
      const ops = obp + slg;
      
      const sbTotal = p.sb + sbFailVal;
      const sbRate = sbTotal > 0 ? (p.sb / sbTotal) * 100 : 0;

      const rc = p.pa > 0 ? ((p.hits + p.walks) * totalBases) / p.pa : 0;

      return { ...p, atBats, avg, obp, slg, ops, rc, sbRate };
    });

    const teamAvgOps = calculated.reduce((acc, cur) => acc + cur.ops, 0) / calculated.length || 0;
    const teamAvgRC = calculated.reduce((acc, cur) => acc + cur.rc, 0) / calculated.length || 0;

    return calculated.map(p => {
      const wRC_plus = teamAvgOps > 0 ? (p.ops / teamAvgOps) * 100 : 0;
      const war = (p.rc - teamAvgRC) / 5; 
      return { ...p, wRC_plus, war };
    });
  }, [rawData]);

  const [sortKey, setSortKey] = useState('ops');
  const sortedPlayers = [...players].sort((a, b) => b[sortKey] - a[sortKey]);
  
  const getTopPlayer = (key) => {
      if (players.length === 0) return { name: '-', war: 0, ops: 0, obp: 0, slg: 0, walks: 0, homerun: 0 };
      return [...players].sort((a, b) => b[key] - a[key])[0];
  }

  // 로딩 중일 때 표시
  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex justify-center items-center">Loading Data...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Mad Dogs Manager
          </h1>
          <p className="text-slate-400 text-sm flex items-center gap-2">
            Team Stats & Analytics 
            <span className="text-[10px] bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700">Online DB Connected</span>
          </p>
        </div>
        
        {/* 팀 요약 스탯 (동일) */}
        <div className="flex gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800">
             {/* ...기존 코드 유지... */}
             <div className="text-center px-2">
                <div className="text-[10px] text-slate-500">AVG</div>
                <div className="font-mono font-bold">
                {(players.length > 0 ? players.reduce((acc, p) => acc + p.avg, 0) / players.length : 0).toFixed(3)}
                </div>
            </div>
             {/* ... */}
        </div>
      </div>

      {/* Input Form Area */}
      <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl mb-8 backdrop-blur-sm">
        <form onSubmit={handleAddPlayer} className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Input 필드들의 name 속성을 DB 컬럼명과 일치시켜야 함. 
                예: sbFail -> sb_fail로 변경 필요하면 변경. 위 코드에서는 로직에서 처리함 */}
             <div className="col-span-2 md:col-span-1">
                <label className="block text-xs text-slate-500 mb-1">선수명</label>
                <input type="text" name="name" value={inputForm.name} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 outline-none" placeholder="이름" />
            </div>
            {/* 나머지 인풋들... (기존과 동일하게 유지하되, name="sbFail" -> name="sb_fail"로 DB 컬럼명과 맞추는게 좋음) */}
             <div>
                <label className="block text-xs text-slate-500 mb-1">타석</label>
                <input type="number" name="pa" value={inputForm.pa} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-center" />
             </div>
             <div>
                <label className="block text-xs text-slate-500 mb-1">안타</label>
                <input type="number" name="hits" value={inputForm.hits} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-center" />
             </div>
             <div>
                <label className="block text-xs text-slate-500 mb-1 text-yellow-500">볼넷</label>
                <input type="number" name="walks" value={inputForm.walks} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-center" />
             </div>
             {/* ...나머지 2루타, 3루타 등등... */}
             {/* (중략: 기존 인풋 폼 그대로 사용) */}
             <div>
                <label className="block text-xs text-slate-500 mb-1">도루실패</label>
                <input type="number" name="sb_fail" value={inputForm.sb_fail} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-center" />
            </div>

            <div className="col-span-2 md:col-span-1 flex items-end">
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded transition flex justify-center items-center gap-2">
                <Save size={18} /> 저장 (DB)
                </button>
            </div>
        </form>
      </div>

      {/* Dashboard Cards & Table (기존과 동일, 데이터 소스만 rawData로 변경됨) */}
      {/* ... */}
      {/* ... 아래쪽 테이블 코드 기존과 동일 ... */}
       <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg mt-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            {/* ...thead... */}
            <tbody className="divide-y divide-slate-800">
              {sortedPlayers.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/50 transition">
                  <td className="px-4 py-3 font-medium text-white sticky left-0 bg-slate-900">{p.name}</td>
                  {/* ...데이터 표시... */}
                  <td className="px-2 py-3 text-center">
                    <button onClick={() => handleDelete(p.id)} className="text-slate-600 hover:text-red-400 transition p-1">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};

export default BaseballDashboard;